# 🔴 RLS POLICY BUG - Giải Thích Chi Tiết

## ❌ Vấn Đề Gốc Rễ

Console log của bạn cho thấy:
```
Current profiles before update: undefined
DB: Checking if user exists...
User not found
```

Nhưng Supabase có dữ liệu:
- `company_members.user_id` tồn tại ✓
- `user_profiles.user_id` tồn tại ✓

**=> Query bị RLS CHẶN, không phải user không tồn tại!**

---

## 🔍 Nguyên Nhân Chính

### **Schema hiện tại (SAI):**

```sql
-- user_profiles RLS Policies:

1. profiles_owner:
   for all using (user_id = auth.uid())
   → Chỉ user chính mình có thể access

2. profiles_admin_update:
   for update using (exists ...)
   → ✅ Admin có thể UPDATE
   → ❌ Admin KHÔNG có thể SELECT !!!
```

### **Vấn đề:**

Admin muốn **SELECT** profiles của nhân viên khác:
```javascript
const { data: profiles } = await supabase
  .from('user_profiles')
  .select('*')  // ← SELECT bị chặn bởi RLS!
  .eq('user_id', userId)
```

RLS chỉ cho phép:
- User chính mình SELECT (profile_owner)
- Admin UPDATE (profiles_admin_update)
- **KHÔNG cho phép Admin SELECT!** ← BUG

---

## ✅ Cách Sửa

### **1. Thêm RLS Policy SELECT cho Admin**

**File: `schema.sql` & `migrations/2026-07-rls-admin-select-profiles.sql`**

```sql
drop policy if exists profiles_admin_select on public.user_profiles;

create policy profiles_admin_select on public.user_profiles
  for select using (
    exists (
      select 1 from public.company_members cm1
      join public.company_members cm2 on cm1.company_id = cm2.company_id
      where cm1.user_id = auth.uid() and cm1.role = 'admin'
        and cm2.user_id = user_profiles.user_id
    )
  );
```

**Logic:**
- Admin (cm1.role = 'admin')
- Của cùng công ty (cm1.company_id = cm2.company_id)
- Có thể SELECT profile của thành viên khác (cm2.user_id)

### **2. Cải Thiện Query Logging**

**File: `src/lib/supabase.js` → `listMemberProfiles()`**

Thêm log chi tiết:
```javascript
const { data: profiles, error: profileError } = await supabase
  .from('user_profiles')
  .select('*')  // Lấy TẤT CẢ columns để debug
  .in('user_id', userIds)

console.log('[DB] Query Error:', profileError)  // Log error chi tiết
console.log('[DB] Raw Profiles Data:', profiles)  // Log raw data
console.log('[DB] Profiles Count:', profiles ? profiles.length : 0)

if (!profiles || profiles.length === 0) {
  console.warn('[DB WARN] Check if Super Admin can SELECT from user_profiles')
  // ← This hints at RLS issue
}
```

### **3. Cải Thiện updateMemberName()**

**File: `src/lib/supabase.js` → `updateMemberName()`**

Thêm log chi tiết từng bước:
```javascript
console.log(`[CHECK] Checking if user exists...`)
const { data: userExists, error: checkError } = await supabase
  .from('user_profiles')
  .select('user_id, full_name, display_name')
  .eq('user_id', userId)

console.log(`[CHECK] Error:`, checkError)  // ← RLS error sẽ hiện ở đây
console.log(`[CHECK] Data:`, userExists)   // ← Empty nếu RLS chặn

if (!userExists || userExists.length === 0) {
  console.error(`This means RLS is blocking SELECT or user doesn't exist`)
}
```

---

## 📋 Files Đã Sửa

| File | Thay Đổi |
|------|----------|
| `schema.sql` | ✅ Thêm `profiles_admin_select` policy |
| `migrations/2026-07-rls-admin-select-profiles.sql` | ✅ NEW - RLS policy migration |
| `src/lib/supabase.js` | ✅ Log chi tiết `listMemberProfiles()` & `updateMemberName()` |

---

## 🧪 Cách Test

### **Step 1: Deploy Migration**

1. Vào **Supabase SQL Editor**
2. Copy & Run:
   ```sql
   migrations/2026-07-rls-admin-select-profiles.sql
   ```
3. Hoặc chạy toàn bộ `schema.sql`

### **Step 2: Test Edit Tên**

1. Open `F12 → Console`
2. Click ✏️ Edit member
3. Change name → Click "Lưu"

### **Step 3: Read Console Logs**

**Before Fix (RLS Blocked):**
```
[DB] Query Error: {code: "PGRST100", message: "..."}
[DB] Raw Profiles Data: null
[DB] Profiles Count: 0
[DB WARN] Check if Super Admin can SELECT from user_profiles
```

**After Fix (RLS Allowed):**
```
[DB] Query Error: null
[DB] Raw Profiles Data: [{user_id: "xxx", full_name: "...", ...}]
[DB] Profiles Count: 1
[UPDATE] ✓ Update successful: {...}
[VERIFY] ✓ Verified: {...}
[VERIFY] ✓✓ Data matches perfectly!
```

---

## 🎯 Key Points

✅ **RLS Policy SELECT không có** → Admin không thể SELECT  
✅ **Thêm `profiles_admin_select`** → Admin có thể SELECT lấy danh sách  
✅ **`profiles_admin_update`** → Admin vẫn có thể UPDATE  
✅ **Log chi tiết** → Dễ debug RLS issue trong tương lai  
✅ **Query trả về null?** → RLS đang chặn, không phải user không tồn tại

---

## 🚀 Deploy Steps

1. **Run Migration:**
   ```sql
   -- Supabase SQL Editor
   Run: migrations/2026-07-rls-admin-select-profiles.sql
   ```

2. **Deploy Code:**
   ```bash
   npm run build
   Deploy dist/ to Netlify
   ```

3. **Test:**
   - Edit tên nhân viên
   - F12 → Console log
   - Verify RLS không chặn

---

## ✨ Result After Fix

✅ Admin có thể SELECT user_profiles  
✅ Admin có thể UPDATE user_profiles  
✅ listMemberProfiles() trả về dữ liệu đúng  
✅ updateMemberName() hoạt động bình thường  
✅ Console log chi tiết giúp debug tương lai

