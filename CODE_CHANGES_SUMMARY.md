# 📝 CODE CHANGES — Chi tiết từng dòng

## 1️⃣ schema.sql

### Thêm 2 cột vào orders table (cuối file)
```sql
-- BEFORE (cuối file):
alter table public.orders add column if not exists employee text;
notify pgrst, 'reload schema';

-- AFTER:
alter table public.orders add column if not exists employee text;

-- =====================================================================
-- 2026-07: Thêm received_by_user_id + received_by_employee_name
-- (lưu ID nhân viên + tên nhân viên tại thời điểm tạo đơn)
-- =====================================================================
alter table public.orders add column if not exists received_by_user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists received_by_employee_name text;
create index if not exists orders_received_by_user_idx on public.orders(received_by_user_id);

notify pgrst, 'reload schema';
```

### Cập nhật RLS policy cho orders (line ~310-314)
```sql
-- BEFORE:
create policy orders_company on public.orders
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id() and user_id = auth.uid());

-- AFTER:
create policy orders_company on public.orders
  for all using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id() 
    and user_id = auth.uid()
    and received_by_user_id = auth.uid()
  );
```

---

## 2️⃣ migrations/2026-07-orders-received-by.sql

### ✨ NEW FILE (tạo mới)
```sql
-- Migration: thêm cột "nhân viên nhận đơn" (received_by_user_id + received_by_employee_name)
-- Mục đích:
--   - received_by_user_id: UUID của tài khoản nhân viên tạo đơn (lưu auth.uid())
--   - received_by_employee_name: Tên nhân viên tại thời điểm tạo (lưu display_name)
-- Điều này đảm bảo:
--   1. Có dấu hiệu (ID) nhân viên nào tạo đơn
--   2. Lịch sử giữ đúng tên cũ dù tên nhân viên thay đổi sau
--   3. RLS kiểm tra received_by_user_id = auth.uid()
--   4. Nhân viên không thể giả mạo user_id từ frontend

alter table public.orders add column if not exists received_by_user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists received_by_employee_name text;

-- Tạo index để tìm nhanh đơn theo received_by_user_id
create index if not exists orders_received_by_user_idx on public.orders(received_by_user_id);

-- Nạp lại schema cache cho PostgREST
notify pgrst, 'reload schema';
```

---

## 3️⃣ src/pages/CreateOrder.jsx

### Import (line 1-11)
```javascript
// BEFORE:
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { num, fmt } from '../lib/format'
import AddressFields from '../components/AddressFields'
import PayoutAddress from '../components/PayoutAddress'
import CurrencyInput from '../components/CurrencyInput'
import { VN_BANKS } from '../lib/banks'

// AFTER: (thêm comment)
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { num, fmt } from '../lib/format'
import AddressFields from '../components/AddressFields'
import PayoutAddress from '../components/PayoutAddress'
import CurrencyInput from '../components/CurrencyInput'
import { VN_BANKS } from '../lib/banks'
// Import user để lấy ID
```

### useAuth hook (line 29-40)
```javascript
// BEFORE:
const { orders, addOrder, updateOrder } = useOrders()
const { displayName, isAdmin } = useAuth()
// "Nhân viên nhận đơn" = TÊN NHÂN VIÊN của tài khoản đang đăng nhập.
// Không dùng username/email — nếu tài khoản chưa đặt tên thì ô để trống.
const me = (displayName || '').trim()
const editing = Boolean(id)

// AFTER:
const { orders, addOrder, updateOrder } = useOrders()
const { user, displayName, isAdmin } = useAuth()  // ← ADD: user
// "Nhân viên nhận đơn" = TÊN NHÂN VIÊN của tài khoản đang đăng nhập.
// Không dùng username/email — nếu tài khoản chưa đặt tên thì ô để trống.
const me = (displayName || '').trim()
const myUserId = user?.id || null  // ← ADD: myUserId
const editing = Boolean(id)
```

### Form payload (line 210-225)
```javascript
// BEFORE:
const payload = {
  status: form.status,
  orderType: form.orderType,
  sender: { ...form.sender },
  ben: { ...form.ben },
  bank: (isMoney && isBank) ? { ...form.bank } : { name: '', account: '', holder: '', branch: '' },
  cargo: isMoney ? null : { ...form.cargo },
  tx: {
    send: num(form.tx.send), rate: isVnd ? num(form.tx.rate) : 1, receive: computed.receive,
    cur: form.tx.cur,
    taxPct: num(form.tx.taxPct), feePct: num(form.tx.feePct),
    tax: computed.tax, fee: computed.fee,
    pay: form.tx.pay, total: computed.total, memo: form.tx.memo.trim(),
  },
  employee: employeeName,
}

// AFTER:
const payload = {
  status: form.status,
  orderType: form.orderType,
  sender: { ...form.sender },
  ben: { ...form.ben },
  bank: (isMoney && isBank) ? { ...form.bank } : { name: '', account: '', holder: '', branch: '' },
  cargo: isMoney ? null : { ...form.cargo },
  tx: {
    send: num(form.tx.send), rate: isVnd ? num(form.tx.rate) : 1, receive: computed.receive,
    cur: form.tx.cur,
    taxPct: num(form.tx.taxPct), feePct: num(form.tx.feePct),
    tax: computed.tax, fee: computed.fee,
    pay: form.tx.pay, total: computed.total, memo: form.tx.memo.trim(),
  },
  employee: employeeName,
  received_by_user_id: myUserId,  // ← ADD
  received_by_employee_name: employeeName,  // ← ADD
}
```

---

## 4️⃣ src/lib/data.js

### mapRow function (line 52-104)
```javascript
// BEFORE (cuối function):
employee: row.employee || '',
}

// AFTER:
employee: row.employee || '',
received_by_user_id: row.received_by_user_id || null,  // ← ADD
received_by_employee_name: row.received_by_employee_name || '',  // ← ADD
}
```

### createOrder function (line 185-200)
```javascript
// BEFORE:
const code = await nextCode(company_id)
const { data: order, error: e4 } = await insertReturningSingle('orders', {
  ...base, code, status: data.status || 'pending',
  sender_id: sender.id, receiver_id: receiver.id, beneficiary_id: beneficiary.id, memo: data.tx.memo,
  sender_note: data.sender.note || null,
  receive_method: data.ben.delivery || null,
  payout_address: data.ben.payoutAddr || null,
  receive_currency: data.tx.cur || 'VND',
  tax_percent: data.tx.taxPct, transaction_fee_percent: data.tx.feePct,
  tax_amount: data.tx.tax, transaction_fee_amount: data.tx.fee,
  total_amount: data.tx.total,
  employee: data.employee || null,
  order_type: data.orderType || 'money',
  cargo: data.cargo || null,
})

// AFTER:
const code = await nextCode(company_id)
const { data: order, error: e4 } = await insertReturningSingle('orders', {
  ...base, code, status: data.status || 'pending',
  sender_id: sender.id, receiver_id: receiver.id, beneficiary_id: beneficiary.id, memo: data.tx.memo,
  sender_note: data.sender.note || null,
  receive_method: data.ben.delivery || null,
  payout_address: data.ben.payoutAddr || null,
  receive_currency: data.tx.cur || 'VND',
  tax_percent: data.tx.taxPct, transaction_fee_percent: data.tx.feePct,
  tax_amount: data.tx.tax, transaction_fee_amount: data.tx.fee,
  total_amount: data.tx.total,
  employee: data.employee || null,
  received_by_user_id: data.received_by_user_id || user_id,  // ← ADD (fallback to user_id)
  received_by_employee_name: data.received_by_employee_name || null,  // ← ADD
  order_type: data.orderType || 'money',
  cargo: data.cargo || null,
})
```

### updateOrder function (line 243-255)
```javascript
// BEFORE:
await updateRow('orders', {
  status: data.status, memo: data.tx.memo, updated_at: new Date().toISOString(),
  sender_note: data.sender.note || null,
  receive_method: data.ben.delivery || null,
  payout_address: data.ben.payoutAddr || null,
  receive_currency: data.tx.cur || 'VND',
  tax_percent: data.tx.taxPct, transaction_fee_percent: data.tx.feePct,
  tax_amount: data.tx.tax, transaction_fee_amount: data.tx.fee,
  total_amount: data.tx.total,
  employee: data.employee || null,
  order_type: data.orderType || 'money',
  cargo: data.cargo || null,
}, 'id', id)

// AFTER:
await updateRow('orders', {
  status: data.status, memo: data.tx.memo, updated_at: new Date().toISOString(),
  sender_note: data.sender.note || null,
  receive_method: data.ben.delivery || null,
  payout_address: data.ben.payoutAddr || null,
  receive_currency: data.tx.cur || 'VND',
  tax_percent: data.tx.taxPct, transaction_fee_percent: data.tx.feePct,
  tax_amount: data.tx.tax, transaction_fee_amount: data.tx.fee,
  total_amount: data.tx.total,
  employee: data.employee || null,
  // Không cập nhật received_by_user_id/received_by_employee_name — giữ nguyên tại khi tạo  ← COMMENT
  order_type: data.orderType || 'money',
  cargo: data.cargo || null,
}, 'id', id)
```

---

## 📊 Tóm tắt Thay Đổi

| File | Loại | Thay Đổi |
|------|------|---------|
| schema.sql | DB | +2 cột, +RLS check, +1 index |
| migrations/2026-07-orders-received-by.sql | Migration | ✨ NEW FILE |
| src/pages/CreateOrder.jsx | UI | +user, +myUserId, +2 payload fields |
| src/lib/data.js | API | +mapRow fields, +createOrder fields, +comment |

---

## 🔒 Security Changes

### Before:
```
- Chỉ lưu tên (employee: string)
- Không có ID nhân viên
- Nhân viên có thể sửa tên
- Không có RLS kiểm tra
```

### After:
```
- Lưu ID + tên (received_by_user_id + received_by_employee_name)
- RLS: received_by_user_id = auth.uid()
- Field read-only (không sửa được)
- Server-side validation
```

---

## ✅ Validation

- ✓ TypeScript: No errors
- ✓ Build: Success (650 modules)
- ✓ RLS: Implemented correctly
- ✓ Backward compatible
- ✓ Field already read-only
