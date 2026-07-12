import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Tạo .env từ .env.example.')
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
)

// --- cache company_id của user hiện tại ---
let _companyId
export function clearCompanyCache() {
  _companyId = undefined
}

export async function currentUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

export async function currentCompanyId() {
  if (_companyId !== undefined) return _companyId
  const user = await currentUser()
  if (!user) {
    _companyId = null
    return null
  }
  const { data } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()
  _companyId = data?.company_id || null
  return _companyId
}

// --- membership / company ---
export async function getMembership() {
  const user = await currentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('company_members')
    .select('company_id, role, company:companies(id, name, address, phone, logo_url, currency, receipt_footer)')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return null

  // Quảng cáo lưu ở bảng riêng company_ads (admin công ty quản, không cần super_admin)
  const company = data.company || null
  if (company) {
    const { data: ads } = await supabase
      .from('company_ads').select('ad_left, ad_right').eq('company_id', data.company_id).maybeSingle()
    company.ad_left = ads?.ad_left || ''
    company.ad_right = ads?.ad_right || ''
  }

  // Cờ super_admin + tên hiển thị + username
  let isSuperAdmin = false
  let displayName = ''
  let username = ''
  const { data: prof } = await supabase
    .from('user_profiles').select('is_super_admin, full_name, display_name, username').eq('user_id', user.id).maybeSingle()
  if (prof) {
    if (prof.is_super_admin) isSuperAdmin = true
    displayName = prof.display_name || prof.full_name || ''
    username = prof.username || ''
  }
  // displayName = TÊN NHÂN VIÊN THẬT (display_name/full_name). Không fallback username/email — nếu chưa đặt tên thì để trống.

  clearCompanyCache()
  _companyId = data.company_id
  return { company_id: data.company_id, role: data.role, company, isSuperAdmin, displayName, username }
}

// Đổi mật khẩu của chính người dùng đang đăng nhập
export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// Admin đặt lại mật khẩu cho nhân viên (qua Netlify Function service_role)
export async function adminResetMemberPassword(userId, password) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Chưa đăng nhập')
  const res = await fetch('/.netlify/functions/reset-member-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ user_id: userId, password }),
  })
  let out = {}
  try { out = await res.json() } catch { /* ignore */ }
  if (!res.ok || out.error) throw new Error(out.error || ('Lỗi máy chủ (HTTP ' + res.status + ')'))
  return out
}

// Lưu quảng cáo (admin công ty) vào bảng riêng company_ads
export async function updateCompanyAds(ad_left, ad_right) {
  const company_id = await currentCompanyId()
  if (!company_id) throw new Error('Chưa có công ty')
  const { error } = await supabase
    .from('company_ads')
    .upsert({ company_id, ad_left: ad_left || null, ad_right: ad_right || null, updated_at: new Date().toISOString() },
      { onConflict: 'company_id' })
  if (error) throw error
}

export async function createCompany(name) {
  const { data, error } = await supabase.rpc('create_company', { p_name: name })
  if (error) throw error
  clearCompanyCache()
  return data
}

export async function acceptInvitation() {
  const { data, error } = await supabase.rpc('accept_invitation')
  if (error) throw error
  clearCompanyCache()
  return data
}

export async function pendingInvitesForMe() {
  const user = await currentUser()
  if (!user) return []
  const email = (user.email || '').toLowerCase()
  const { data } = await supabase
    .from('invitations')
    .select('id, role, accepted, company:companies(name)')
    .eq('accepted', false)
    .ilike('email', email)
  return data || []
}

// Admin mời/tạo thành viên kèm quyền (perms là object {can_*: bool})
export async function adminInviteMember(email, role = 'staff', perms = {}) {
  const { error } = await supabase.rpc('admin_invite_member', {
    p_email: email, p_role: role, p_perms: perms,
  })
  if (error) throw error
}

// Admin tạo TRỰC TIẾP tài khoản nhân viên qua Netlify Function (service_role).
// identifier: username HOẶC email. fullName: tên nhân viên (bắt buộc).
export async function adminCreateMember({ identifier, fullName, password, role = 'staff', perms = {} }) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Chưa đăng nhập')
  const res = await fetch('/.netlify/functions/create-member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ identifier, full_name: fullName, password, role, perms }),
  })
  let out = {}
  try { out = await res.json() } catch { /* ignore */ }
  if (!res.ok || out.error) throw new Error(out.error || ('Lỗi máy chủ (HTTP ' + res.status + ')'))
  return out
}

// Danh sách thành viên kèm tên/username/email qua RPC SECURITY DEFINER.
// RPC này chỉ trả về thành viên cùng công ty mà admin được phép xem,
// nên tên vẫn hiển thị đúng khi RLS của user_profiles đang bật.
export async function listMemberProfiles(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return {}

  const cleanIds = [...new Set(userIds.filter(Boolean))]
  if (cleanIds.length === 0) return {}

  const { data, error } = await supabase.rpc('list_member_profiles_secure', {
    p_user_ids: cleanIds,
  })

  if (error) {
    console.error('[listMemberProfiles] RPC error:', error)
    throw new Error(`Không tải được tên thành viên: ${error.message}`)
  }

  const map = {}
  for (const profile of data || []) {
    map[profile.user_id] = profile
  }
  return map
}

// Danh sách thành viên: company_members là TABLE -> select trực tiếp, KHÔNG dùng RPC.
export async function listMembers() {
  const { data, error } = await supabase
    .from('company_members')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    email: m.email || m.user_id,
    role: m.role,
    active: m.active,
    perms: {
      can_create: m.can_create, can_edit: m.can_edit, can_delete: m.can_delete,
      can_change_status: m.can_change_status, can_view_receipt: m.can_view_receipt,
      can_manage_customers: m.can_manage_customers, can_manage_members: m.can_manage_members,
      can_manage_cargo: m.can_manage_cargo,
    },
  }))
}

export async function setMemberRole(userId, role) {
  const { error } = await supabase.rpc('set_member_role', { p_user: userId, p_role: role })
  if (error) throw error
}

export async function setMemberPermissions(userId, perms) {
  const { error } = await supabase.rpc('set_member_permissions', { p_user: userId, p_perms: perms })
  if (error) throw error
}

export async function setMemberActive(userId, active) {
  const { error } = await supabase.rpc('set_member_active', { p_user: userId, p_active: active })
  if (error) throw error
}

export async function removeMember(userId) {
  const { error } = await supabase.rpc('remove_member', { p_user: userId })
  if (error) throw error
}

// Admin update tên nhân viên - dùng RPC SECURITY DEFINER
export async function updateMemberName(userId, fullName, displayName) {
  const cleanUserId = typeof userId === 'string' ? userId.trim() : ''
  const cleanFullName = typeof fullName === 'string' ? fullName.trim() : ''
  const cleanDisplayName = typeof displayName === 'string' && displayName.trim()
    ? displayName.trim()
    : cleanFullName

  if (!cleanUserId) throw new Error('User ID không hợp lệ')
  if (!cleanFullName) throw new Error('Tên không được để trống')

  const { data, error } = await supabase.rpc('update_member_name_secure', {
    p_target_user_id: cleanUserId,
    p_full_name: cleanFullName,
    p_display_name: cleanDisplayName,
  })

  if (error) {
    console.error('[updateMemberName] RPC error:', error)
    throw new Error(`Cập nhật thất bại: ${error.message}`)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  // Function mới luôn trả JSON. Giữ fallback này để không báo lỗi giả
  // nếu PostgREST trả null do schema cache chưa kịp refresh.
  return data || {
    success: true,
    user_id: cleanUserId,
    full_name: cleanFullName,
    display_name: cleanDisplayName,
  }
}

// Super Admin update tên của chính mình
export async function updateMyName(fullName, displayName) {
  const user = await currentUser()
  if (!user) throw new Error('Chưa đăng nhập')
  const { error } = await supabase
    .from('user_profiles')
    .update({ full_name: fullName, display_name: displayName })
    .eq('user_id', user.id)
  if (error) throw error
}

// Admin cập nhật tên nhân viên (display_name)
export async function updateEmployeeName(userId, displayName) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ display_name: displayName })
    .eq('user_id', userId)
  if (error) throw error
}

export async function listInvitations() {
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, accepted, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateCompany(fields) {
  const cid = await currentCompanyId()
  if (!cid) throw new Error('Chưa có công ty')
  const { error } = await supabase.from('companies').update(fields).eq('id', cid)
  if (error) throw error
}
