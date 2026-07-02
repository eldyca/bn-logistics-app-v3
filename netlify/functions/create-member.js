// netlify/functions/create-member.js
// Admin tạo trực tiếp tài khoản nhân viên bằng Supabase Auth Admin API (server-side).
// Phiên bản này LOG chi tiết (console.error) và LUÔN trả JSON lỗi rõ ràng (không bao giờ {}).
//
// Biến môi trường cần đặt trong Netlify (Site settings -> Environment variables):
//   SUPABASE_URL                 = https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    = <service_role key>   (KHÔNG đặt tiền tố VITE_)

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Luôn trả JSON; nếu obj rỗng vẫn kèm thông tin tối thiểu.
function resp(statusCode, obj) {
  const payload = obj && typeof obj === 'object' ? obj : { error: String(obj) }
  if (statusCode >= 400 && !payload.error) payload.error = 'Lỗi không xác định (HTTP ' + statusCode + ')'
  return {
    statusCode,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

// Trích mọi trường có ích từ một lỗi (Error thường hoặc lỗi Supabase/PostgREST).
function describe(e) {
  if (!e) return { error: 'Lỗi rỗng (null/undefined)' }
  if (typeof e === 'string') return { error: e }
  return {
    error: e.message || e.error_description || e.msg || e.error || JSON.stringify(e) || String(e),
    name: e.name,
    status: e.status ?? e.statusCode ?? e.code,
    code: e.code,
    details: e.details,
    hint: e.hint,
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: 'ok' }
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' })

  try {
    // 0) Cấu hình
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      const missing = [!SUPABASE_URL && 'SUPABASE_URL', !SERVICE_ROLE && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean)
      console.error('[create-member] Thiếu biến môi trường:', missing)
      return resp(500, { error: 'Server chưa cấu hình: ' + missing.join(', '), stage: 'config', missing })
    }

    // 1) Token người gọi
    const authHeader = event.headers.authorization || event.headers.Authorization || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      console.error('[create-member] Thiếu Authorization header')
      return resp(401, { error: 'Chưa đăng nhập (thiếu token)', stage: 'auth-header' })
    }

    // 2) Đọc body (Netlify có thể mã hoá base64)
    let raw = event.body || '{}'
    if (event.isBase64Encoded) {
      try { raw = Buffer.from(raw, 'base64').toString('utf8') } catch (e) {
        console.error('[create-member] Giải mã base64 body lỗi:', e)
      }
    }
    let body
    try {
      body = JSON.parse(raw || '{}')
    } catch (e) {
      console.error('[create-member] JSON.parse body lỗi. raw =', raw, e)
      return resp(400, { error: 'Body không phải JSON hợp lệ', stage: 'parse-body', raw })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 3) Xác định người gọi
    const { data: gu, error: uErr } = await admin.auth.getUser(token)
    if (uErr || !gu || !gu.user) {
      console.error('[create-member] getUser lỗi:', describe(uErr))
      return resp(401, { error: 'Phiên đăng nhập không hợp lệ', stage: 'get-user', ...describe(uErr) })
    }
    const caller = gu.user

    // 4) Kiểm tra admin đang hoạt động
    const { data: me, error: meErr } = await admin
      .from('company_members')
      .select('company_id, role, active')
      .eq('user_id', caller.id)
      .single()
    if (meErr) {
      console.error('[create-member] Truy vấn company_members lỗi:', describe(meErr))
      return resp(403, { error: 'Không đọc được thông tin thành viên của bạn', stage: 'load-caller', ...describe(meErr) })
    }
    if (!me || me.role !== 'admin' || me.active !== true) {
      console.error('[create-member] Người gọi không phải admin active:', me)
      return resp(403, { error: 'Chỉ admin đang hoạt động mới được tạo tài khoản', stage: 'check-admin', role: me && me.role, active: me && me.active })
    }

    // 5) Input: identifier có thể là username HOẶC email; full_name bắt buộc
    const identifier = String(body.identifier || body.email || '').trim()
    const fullName = String(body.full_name || '').trim()
    const password = String(body.password || '')
    const role = body.role === 'admin' ? 'admin' : 'staff'
    const perms = body.perms || {}
    if (!identifier) return resp(400, { error: 'Thiếu username/email nhân viên', stage: 'validate' })
    if (!fullName) return resp(400, { error: 'Bắt buộc nhập tên nhân viên', stage: 'validate' })
    if (password.length < 6) return resp(400, { error: 'Mật khẩu khởi tạo phải từ 6 ký tự trở lên', stage: 'validate' })

    // Có '@' -> email thật. Không '@' -> username, sinh email nội bộ để Auth hoạt động.
    let email, username
    if (identifier.includes('@')) {
      email = identifier.toLowerCase()
      username = (body.username && String(body.username).trim()) || null
      if (!/^\S+@\S+\.\S+$/.test(email)) return resp(400, { error: 'Email không hợp lệ', stage: 'validate', email })
    } else {
      username = identifier
      email = identifier.toLowerCase() + '@bnlogistics.local'
    }

    // 6) Tạo user trong Auth — gọi TRỰC TIẾP Supabase Auth Admin API (không dùng client createUser)
    let createRes, createText
    try {
      createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email, password, email_confirm: true,
          user_metadata: { role, full_name: fullName, display_name: fullName, username: username || undefined },
        }),
      })
      createText = await createRes.text()
    } catch (e) {
      console.error('[create-member] fetch Auth Admin API lỗi (network):', describe(e))
      return resp(502, { error: 'Không gọi được Supabase Auth Admin API', stage: 'create-user-fetch', ...describe(e) })
    }

    if (!createRes.ok) {
      console.error('[create-member] createUser HTTP', createRes.status, '— response:', createText)
      let parsed = null
      try { parsed = JSON.parse(createText) } catch { /* not json */ }
      const apiMsg = parsed && (parsed.msg || parsed.message || parsed.error_description || parsed.error)
      return resp(createRes.status === 422 ? 400 : 502, {
        error: apiMsg || 'Không tạo được tài khoản (email có thể đã tồn tại)',
        stage: 'create-user',
        http_status: createRes.status,
        response: createText,
      })
    }

    let createdUser
    try {
      createdUser = JSON.parse(createText)
    } catch (e) {
      console.error('[create-member] parse response createUser lỗi — response:', createText)
      return resp(500, { error: 'Phản hồi tạo user không phải JSON', stage: 'create-user-parse', response: createText, ...describe(e) })
    }
    const newId = createdUser && (createdUser.id || (createdUser.user && createdUser.user.id))
    if (!newId) {
      console.error('[create-member] Không tìm thấy user id trong response:', createText)
      return resp(500, { error: 'Không lấy được user id sau khi tạo', stage: 'create-user-id', response: createText })
    }

    // 7) Đảm bảo public.users + user_profiles (phòng khi trigger chưa lưu kịp)
    const { error: upErr } = await admin.from('users').upsert({ id: newId, email }, { onConflict: 'id' })
    if (upErr) console.error('[create-member] upsert public.users (bỏ qua được):', describe(upErr))

    const profileRow = { user_id: newId, full_name: fullName, display_name: fullName }
    if (username) profileRow.username = username
    const { error: pErr } = await admin.from('user_profiles').upsert(profileRow, { onConflict: 'user_id' })
    if (pErr) {
      // username trùng -> báo lỗi rõ + rollback user vừa tạo
      console.error('[create-member] upsert user_profiles lỗi -> rollback:', describe(pErr))
      await admin.auth.admin.deleteUser(newId).catch(() => {})
      const dup = (pErr.code === '23505') || /duplicate|unique/i.test(pErr.message || '')
      return resp(400, { error: dup ? 'Username đã tồn tại, hãy chọn tên khác' : 'Lưu hồ sơ người dùng lỗi (đã rollback)', stage: 'upsert-profile', ...describe(pErr) })
    }

    // 8) Thêm vào company_members
    // Không gửi 'email' để không phụ thuộc cột email (email đã có trong auth.users).
    const memberRow = {
      company_id: me.company_id,
      user_id: newId,
      role,
      active: true,
      can_create: perms.can_create ?? true,
      can_edit: perms.can_edit ?? true,
      can_delete: perms.can_delete ?? false,
      can_change_status: perms.can_change_status ?? true,
      can_view_receipt: perms.can_view_receipt ?? true,
      can_manage_customers: perms.can_manage_customers ?? true,
      can_manage_members: perms.can_manage_members ?? false,
      can_manage_cargo: perms.can_manage_cargo ?? true,
    }
    const { error: mErr } = await admin.from('company_members').insert(memberRow)
    if (mErr) {
      console.error('[create-member] insert company_members lỗi -> rollback user:', describe(mErr))
      const { error: delErr } = await admin.auth.admin.deleteUser(newId)
      if (delErr) console.error('[create-member] rollback deleteUser lỗi:', describe(delErr))
      return resp(400, { error: 'Tạo user xong nhưng thêm vào company_members lỗi (đã rollback)', stage: 'insert-member', ...describe(mErr) })
    }

    console.log('[create-member] OK', { email, username, role, user_id: newId, company_id: me.company_id })
    return resp(200, { ok: true, user_id: newId, email, username, role })
  } catch (e) {
    console.error('[create-member] Lỗi không bắt được:', e && e.stack ? e.stack : e)
    return resp(500, { error: 'Lỗi máy chủ', stage: 'uncaught', ...describe(e) })
  }
}
