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
  
  console.log('[DB] ===== listMemberProfiles START =====')
  console.log('[DB] Fetching profiles for users:', userIds)
  
  // Fetch toàn bộ columns để debug
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')  // Lấy TẤT CẢ columns để debug
    .in('user_id', userIds)
  
  console.log('[DB] Query Error:', profileError)
  console.log('[DB] Raw Profiles Data:', profiles)
  console.log('[DB] Profiles Count:', profiles ? profiles.length : 0)
  
  if (profileError) {
    console.error('[DB ERROR] Profile fetch failed:', profileError)
    console.error('[DB ERROR] This might be RLS policy issue!')
    throw profileError
  }
  
  if (!profiles || profiles.length === 0) {
    console.warn('[DB WARN] No profiles returned! Possible RLS blocking.')
    console.warn('[DB WARN] Check if Super Admin can SELECT from user_profiles')
    return {}
  }
  
  // Log từng profile
  profiles.forEach(p => {
    console.log(`[DB] Profile: user_id="${p.user_id}", full_name="${p.full_name}", display_name="${p.display_name}", username="${p.username}"`)
  })
  
  // Lấy email từ users table
  console.log('[DB] Fetching emails from users table...')
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .in('id', userIds)
  
  console.log('[DB] Users Query Error:', userError)
  console.log('[DB] Raw Users Data:', users)
  
  if (userError) {
    console.error('[DB ERROR] User fetch failed:', userError)
    throw userError
  }
  
  // Map dữ liệu
  const map = {}
  for (const p of profiles || []) {
    console.log(`[MAP] Adding profile: ${p.user_id} → full_name="${p.full_name}"`)
    map[p.user_id] = p
  }
  
  // Thêm email vào map
  for (const u of users || []) {
    if (map[u.id]) {
      map[u.id].email = u.email
      console.log(`[MAP] Added email for ${u.id}: ${u.email}`)
    } else {
      map[u.id] = { user_id: u.id, email: u.email }
    }
  }
  
  console.log('[DB] ===== FINAL PROFILES MAP =====')
  console.log('[DB] Map Keys:', Object.keys(map))
  console.log('[DB] Full Map:', map)
  console.log('[DB] ===== listMemberProfiles END =====')
  
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
  console.log(`\n========== updateMemberName START ==========`)
  console.log(`[UPDATE] user_id: ${userId}`)
  console.log(`[UPDATE] full_name: ${fullName}`)
  console.log(`[UPDATE] display_name: ${displayName}`)
  
  // 1. Kiểm tra input
  if (!userId) throw new Error('User ID không hợp lệ')
  if (!fullName || !displayName) throw new Error('Tên không được để trống')
  
  // 2. Check user tồn tại trước
  console.log(`[CHECK] Checking if user exists...`)
  const { data: userExists, error: checkError } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, display_name')
    .eq('user_id', userId)
  
  console.log(`[CHECK] Error:`, checkError)
  console.log(`[CHECK] Data:`, userExists)
  
  if (checkError) {
    console.error(`[ERROR] Check query failed:`, checkError)
    throw new Error(`Kiểm tra user thất bại: ${checkError.message}`)
  }
  
  if (!userExists || userExists.length === 0) {
    console.error(`[ERROR] User not found in user_profiles for ID: ${userId}`)
    console.error(`[ERROR] This means RLS is blocking SELECT or user doesn't exist`)
    throw new Error(`User ID không tồn tại trong hệ thống: ${userId}`)
  }
  
  console.log(`[CHECK] ✓ User exists:`, userExists[0])
  
  // 3. Cập nhật database
  console.log(`[UPDATE] Calling update query...`)
  const { data: updateData, error: updateError } = await supabase
    .from('user_profiles')
    .update({ full_name: fullName, display_name: displayName })
    .eq('user_id', userId)
    .select()
  
  console.log(`[UPDATE] Error:`, updateError)
  console.log(`[UPDATE] Data:`, updateData)
  
  if (updateError) {
    console.error(`[ERROR] Update failed:`, updateError)
    throw new Error(`Cập nhật database thất bại: ${updateError.message}`)
  }
  
  if (!updateData || updateData.length === 0) {
    console.error(`[ERROR] Update returned no data`)
    throw new Error('Cập nhật không thành công - không tìm thấy user')
  }
  
  console.log(`[UPDATE] ✓ Update successful:`, updateData[0])
  
  // 4. Verify update bằng fetch lại
  console.log(`[VERIFY] Verifying update...`)
  const { data: verified, error: verifyError } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, display_name')
    .eq('user_id', userId)
  
  console.log(`[VERIFY] Error:`, verifyError)
  console.log(`[VERIFY] Data:`, verified)
  
  if (verifyError) {
    console.error(`[ERROR] Verification query failed:`, verifyError)
  } else if (verified && verified.length > 0) {
    console.log(`[VERIFY] ✓ Verified:`, verified[0])
    if (verified[0].full_name === fullName && verified[0].display_name === displayName) {
      console.log(`[VERIFY] ✓✓ Data matches perfectly!`)
    } else {
      console.warn(`[WARN] Data mismatch!`)
      console.warn(`[WARN] Expected:`, { fullName, displayName })
      console.warn(`[WARN] Got:`, { full_name: verified[0].full_name, display_name: verified[0].display_name })
    }
  }
  
  // 5. Wait để Supabase sync
  console.log(`[WAIT] Waiting 800ms for Supabase sync...`)
  await new Promise(resolve => setTimeout(resolve, 800))
  console.log(`[WAIT] ✓ Sync complete`)
  
  console.log(`========== updateMemberName END ==========\n`)
  return updateData[0]
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
