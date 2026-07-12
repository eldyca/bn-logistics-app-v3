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

// Danh sách thành viên kèm tên/username từ user_profiles + email từ users
export async function listMemberProfiles(userIds) {
  if (!userIds || !userIds.length) return {}
  
  console.log('[DB] Fetching profiles for users:', userIds)
  
  // Force refresh: thêm timestamp vào query để bypass cache
  const timestamp = Date.now()
  
  // Lấy profile (tên, username) - with cache busting
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, display_name, username, updated_at')
    .in('user_id', userIds)
    .order('updated_at', { ascending: false }) // Force fresh data
  
  if (profileError) {
    console.error('[DB ERROR] Profile fetch failed:', profileError)
    throw profileError
  }
  
  console.log('[DB] Profiles fetched (timestamp=' + timestamp + '):', profiles)
  
  // Lấy email từ users table
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, updated_at')
    .in('id', userIds)
  
  if (userError) {
    console.error('[DB ERROR] User fetch failed:', userError)
    throw userError
  }
  
  console.log('[DB] Users fetched:', users)
  
  // Map dữ liệu
  const map = {}
  for (const p of profiles || []) {
    console.log(`[MAP] Profile ${p.user_id}: full_name="${p.full_name}", display_name="${p.display_name}"`)
    map[p.user_id] = p
  }
  // Thêm email vào map
  for (const u of users || []) {
    if (map[u.id]) {
      map[u.id].email = u.email
    } else {
      map[u.id] = { user_id: u.id, email: u.email }
    }
  }
  
  console.log('[DB] Final profile map:', map)
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

// Admin update tên nhân viên
export async function updateMemberName(userId, fullName, displayName) {
  console.log(`[DB] Updating user_profiles: user_id=${userId}, full_name=${fullName}, display_name=${displayName}`)
  
  // 1. Kiểm tra user_id hợp lệ
  if (!userId) throw new Error('User ID không hợp lệ')
  if (!fullName || !displayName) throw new Error('Tên không được để trống')
  
  // 2. Cập nhật database
  const { data, error, status } = await supabase
    .from('user_profiles')
    .update({ full_name: fullName, display_name: displayName })
    .eq('user_id', userId)
    .select()
  
  if (error) {
    console.error('[DB ERROR]', error)
    throw new Error(`Cập nhật database thất bại: ${error.message}`)
  }
  
  console.log(`[DB] Update status: ${status}, data:`, data)
  
  // 3. Xác nhận update thành công
  if (!data || data.length === 0) {
    throw new Error('Cập nhật không thành công - không tìm thấy user')
  }
  
  console.log('[DB] Update verified:', data[0])
  
  // 4. Verify update đúng bằng cách fetch lại ngay
  console.log('[DB] Verifying update by fetching...')
  const { data: verify, error: verifyError } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, display_name')
    .eq('user_id', userId)
    .single()
  
  if (verifyError) {
    console.error('[DB ERROR] Verification failed:', verifyError)
  } else {
    console.log('[DB] Verification passed:', verify)
    if (verify.full_name !== fullName || verify.display_name !== displayName) {
      console.warn('[DB WARN] Verification mismatch! Expected:', { fullName, displayName }, 'Got:', { full_name: verify.full_name, display_name: verify.display_name })
    }
  }
  
  // 5. Wait để Supabase sync toàn bộ
  await new Promise(resolve => setTimeout(resolve, 800))
  
  return data[0]
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
