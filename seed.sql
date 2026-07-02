-- =====================================================================
-- Dữ liệu mẫu (tuỳ chọn) — multi-tenant
-- Cách dùng:
--   1) Đăng ký tài khoản trong app HOẶC tạo user ở Supabase > Authentication.
--   2) Lấy User UID, thay vào v_user bên dưới.
--   3) Chạy trong SQL Editor (chạy bằng quyền cao sẽ bỏ qua RLS).
-- File tự tạo công ty + gán user làm admin + thêm 1 đơn mẫu.
-- =====================================================================
do $$
declare
  v_user   uuid := '00000000-0000-0000-0000-000000000000'; -- THAY UUID THẬT
  v_comp   uuid;
  v_sender uuid;
  v_recv   uuid;
  v_ben    uuid;
  v_order  uuid;
begin
  if v_user = '00000000-0000-0000-0000-000000000000' then
    raise notice 'Hãy thay v_user bằng UUID thật trước khi chạy seed.';
    return;
  end if;

  -- Công ty + thành viên admin (nếu user chưa có công ty)
  if not exists (select 1 from public.company_members where user_id = v_user) then
    insert into public.companies (name, created_by, address, phone, currency)
    values ('ABC Money Transfer', v_user, '123 Main St, Garden Grove, CA', '714-000-0000', 'USD')
    returning id into v_comp;
    insert into public.company_members (company_id, user_id, role)
    values (v_comp, v_user, 'admin');
  else
    select company_id into v_comp from public.company_members where user_id = v_user limit 1;
  end if;

  insert into public.senders (company_id, user_id, phone, first_name, last_name, country, state, city, zip, address)
  values (v_comp, v_user, '714-111-2222', 'Nguyen', 'Van A', 'United States', 'California', 'Garden Grove', '92843', '14391 Deanann Pl')
  returning id into v_sender;

  insert into public.receivers (company_id, user_id, phone, first_name, last_name, country, state, city, province, delivery_method, address)
  values (v_comp, v_user, '0900000002', 'Tran', 'Thi B', 'Vietnam', 'TP Hồ Chí Minh', 'Quận 1', 'TP Hồ Chí Minh', 'Chuyển khoản ngân hàng', '456 Lê Lợi')
  returning id into v_recv;

  insert into public.beneficiaries (company_id, user_id, receiver_id, bank_name, account_number, account_holder, branch)
  values (v_comp, v_user, v_recv, 'Vietcombank', '0123456789', 'Tran Thi B', 'CN Quận 1')
  returning id into v_ben;

  insert into public.orders (company_id, user_id, code, status, sender_id, receiver_id, beneficiary_id, memo)
  values (v_comp, v_user, 'GD260616-001', 'pending', v_sender, v_recv, v_ben, 'Đơn mẫu')
  returning id into v_order;

  insert into public.transactions
    (company_id, user_id, order_id, send_amount, rate, receive_amount, charge, commission, fee, tax, payment_method, total)
  values
    (v_comp, v_user, v_order, 100.00, 25000, 2500000.00, 5.00, 0, 2.00, 1.00, 'Tiền mặt', 108.00);

  insert into public.activity_logs (company_id, user_id, text)
  values (v_comp, v_user, 'Tạo đơn mẫu GD260616-001');
end $$;
