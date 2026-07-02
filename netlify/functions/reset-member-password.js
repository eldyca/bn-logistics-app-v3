// netlify/functions/reset-member-password.js
// Admin đặt lại mật khẩu cho nhân viên TRONG CÙNG công ty (Supabase Auth Admin API,
// chạy server-side bằng service_role). Admin không reset được người ngoài công ty mình.

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const resp = (statusCode, obj) => ({
  statusCode,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(obj && typeof obj === 'object' ? obj : { error: String(obj) }),
})
function describe(e) {
  if (!e) return { error: 'Lỗi rỗng' }
  if (typeof e === 'string') return { error: e }
  return { error: e.message || JSON.stringify(e) || String(e), code: e.code, status: e.status }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: 'ok' }
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' })

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return resp(500, { error: 'Server chưa cấu hình SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' })
    }
    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return resp(401, { error: 'Chưa đăng nhập' })

    let raw = event.body || '{}'
    if (event.isBase64Encoded) {
      try { raw = Buffer.from(raw, 'base64').toString('utf8') } catch (e) { console.error('base64 decode lỗi:', e) }
    }
    let body
    try { body = JSON.parse(raw || '{}') } catch (e) {
      console.error('JSON.parse body lỗi. raw =', raw, e)
      return resp(400, { error: 'Body không phải JSON hợp lệ' })
    }

    const targetUserId = String(body.user_id || '').trim()
    const password = String(body.password || '')
    if (!targetUserId) return resp(400, { error: 'Thiếu user_id' })
    if (password.length < 6) return resp(400, { error: 'Mật khẩu mới phải từ 6 ký tự trở lên' })

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } })

    // 1) Người gọi là admin đang hoạt động
    const { data: gu, error: uErr } = await admin.auth.getUser(token)
    if (uErr || !gu || !gu.user) {
      console.error('getUser lỗi:', describe(uErr))
      return resp(401, { error: 'Phiên đăng nhập không hợp lệ', ...describe(uErr) })
    }
    const caller = gu.user

    const { data: me, error: meErr } = await admin
      .from('company_members').select('company_id, role, active').eq('user_id', caller.id).single()
    if (meErr || !me || me.role !== 'admin' || me.active !== true) {
      console.error('Người gọi không phải admin active:', describe(meErr), me)
      return resp(403, { error: 'Chỉ admin đang hoạt động mới được đặt lại mật khẩu' })
    }

    // 2) Người được reset phải thuộc CÙNG công ty
    const { data: target, error: tErr } = await admin
      .from('company_members').select('user_id, company_id').eq('user_id', targetUserId).single()
    if (tErr || !target) {
      console.error('Không tìm thấy nhân viên:', describe(tErr))
      return resp(404, { error: 'Không tìm thấy nhân viên này' })
    }
    if (target.company_id !== me.company_id) {
      return resp(403, { error: 'Nhân viên không thuộc công ty của bạn' })
    }
    if (targetUserId === caller.id) {
      return resp(400, { error: 'Hãy dùng mục "Đổi mật khẩu" để đổi mật khẩu của chính bạn' })
    }

    // 3) Đặt lại mật khẩu
    const { error: upErr } = await admin.auth.admin.updateUserById(targetUserId, { password })
    if (upErr) {
      console.error('updateUserById lỗi:', describe(upErr))
      return resp(400, { error: (upErr && upErr.message) || 'Không đặt lại được mật khẩu', ...describe(upErr) })
    }

    console.log('[reset-member-password] OK', { by: caller.id, target: targetUserId })
    return resp(200, { ok: true, user_id: targetUserId })
  } catch (e) {
    console.error('[reset-member-password] uncaught:', e && e.stack ? e.stack : e)
    return resp(500, { error: 'Lỗi máy chủ', ...describe(e) })
  }
}
