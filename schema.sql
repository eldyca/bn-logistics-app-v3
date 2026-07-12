-- =====================================================================
-- Hệ thống quản lý chuyển tiền — Supabase schema (multi-tenant)
-- Một công ty có nhiều người dùng. Mỗi user thuộc về đúng MỘT công ty.
-- Dữ liệu được phân tách theo company_id; RLS đảm bảo công ty này KHÔNG
-- thấy dữ liệu của công ty khác.
-- Chạy toàn bộ file này trong Supabase SQL Editor.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- users: phản chiếu auth.users
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- companies: công ty (tenant)
-- ---------------------------------------------------------------------
create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- company_members: thành viên của công ty (admin / staff)
-- Mỗi user chỉ thuộc một công ty -> unique(user_id)
-- ---------------------------------------------------------------------
create table if not exists public.company_members (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'staff' check (role in ('admin','staff')),
  created_at  timestamptz not null default now(),
  unique (user_id)
);
create index if not exists members_company_idx on public.company_members (company_id);

-- ---------------------------------------------------------------------
-- invitations: lời mời nhân viên (admin mời theo email)
-- ---------------------------------------------------------------------
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  email       text not null,
  role        text not null default 'staff' check (role in ('admin','staff')),
  invited_by  uuid references auth.users (id) on delete set null,
  accepted    boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (company_id, email)
);
create index if not exists invitations_email_idx on public.invitations (lower(email));

-- ---------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------
create table if not exists public.user_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  full_name     text,
  business_name text,
  phone         text,
  created_at    timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------------------
-- senders / receivers / beneficiaries
-- ---------------------------------------------------------------------
create table if not exists public.senders (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  phone text, first_name text, last_name text, middle_name text,
  zip text, city text, state text, address text, message text,
  created_at  timestamptz not null default now()
);

create table if not exists public.receivers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  phone text, other_phone text, first_name text, last_name text,
  first_name2 text, last_name2 text, province text, delivery_method text, address text,
  created_at  timestamptz not null default now()
);

create table if not exists public.beneficiaries (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  receiver_id    uuid references public.receivers (id) on delete set null,
  bank_name text, account_number text, account_holder text, branch text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- orders / transactions
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  code           text not null,
  status         text not null default 'pending'
                 check (status in ('pending','processing','completed','cancelled')),
  sender_id      uuid references public.senders (id) on delete set null,
  receiver_id    uuid references public.receivers (id) on delete set null,
  beneficiary_id uuid references public.beneficiaries (id) on delete set null,
  memo           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_company_idx on public.orders (company_id, created_at desc);

create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  order_id       uuid not null references public.orders (id) on delete cascade,
  send_amount    numeric(18,2) not null default 0,
  rate           numeric(18,4) not null default 1,
  receive_amount numeric(18,2) not null default 0,
  charge         numeric(18,2) not null default 0,
  commission     numeric(18,2) not null default 0,
  fee            numeric(18,2) not null default 0,
  tax            numeric(18,2) not null default 0,
  payment_method text,
  total          numeric(18,2) not null default 0,
  created_at     timestamptz not null default now(),
  unique (order_id)
);

-- ---------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------
create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists activity_company_idx on public.activity_logs (company_id, created_at desc);

-- ---------------------------------------------------------------------
-- Nâng cấp từ schema cũ (nếu bảng đã tồn tại mà chưa có company_id)
-- ---------------------------------------------------------------------
alter table public.senders        add column if not exists company_id uuid references public.companies (id) on delete cascade;
alter table public.receivers      add column if not exists company_id uuid references public.companies (id) on delete cascade;
alter table public.beneficiaries  add column if not exists company_id uuid references public.companies (id) on delete cascade;
alter table public.orders         add column if not exists company_id uuid references public.companies (id) on delete cascade;
alter table public.transactions   add column if not exists company_id uuid references public.companies (id) on delete cascade;
alter table public.activity_logs  add column if not exists company_id uuid references public.companies (id) on delete cascade;

-- =====================================================================
-- Hàm trợ giúp (SECURITY DEFINER để tránh đệ quy RLS)
-- =====================================================================
create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.company_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_company_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- =====================================================================
-- RPC: thao tác có đặc quyền (chạy bằng definer, kiểm soát chặt bên trong)
-- =====================================================================

-- Tạo công ty mới; người tạo trở thành admin. Trả về company_id.
create or replace function public.create_company(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if exists (select 1 from public.company_members where user_id = v_uid) then
    raise exception 'Người dùng đã thuộc một công ty';
  end if;
  insert into public.companies (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Công ty của tôi'), v_uid)
  returning id into v_id;
  insert into public.company_members (company_id, user_id, role)
  values (v_id, v_uid, 'admin');
  return v_id;
end $$;

-- Admin mời nhân viên theo email.
create or replace function public.invite_staff(p_email text, p_role text default 'staff')
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cid uuid;
begin
  select company_id into v_cid from public.company_members
  where user_id = v_uid and role = 'admin';
  if v_cid is null then raise exception 'Chỉ admin của công ty mới được mời'; end if;
  insert into public.invitations (company_id, email, role, invited_by)
  values (v_cid, lower(trim(p_email)),
          case when p_role = 'admin' then 'admin' else 'staff' end, v_uid)
  on conflict (company_id, email)
  do update set role = excluded.role, accepted = false, invited_by = v_uid;
end $$;

-- Người được mời chấp nhận lời mời (khớp theo email của chính họ).
create or replace function public.accept_invitation()
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; v_inv record;
begin
  if v_uid is null then raise exception 'Chưa đăng nhập'; end if;
  if exists (select 1 from public.company_members where user_id = v_uid) then
    return (select company_id from public.company_members where user_id = v_uid limit 1);
  end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  select * into v_inv from public.invitations
  where lower(email) = v_email and accepted = false
  order by created_at desc limit 1;
  if v_inv is null then raise exception 'Không có lời mời nào cho email này'; end if;
  insert into public.company_members (company_id, user_id, role)
  values (v_inv.company_id, v_uid, v_inv.role);
  update public.invitations set accepted = true where id = v_inv.id;
  return v_inv.company_id;
end $$;

-- =====================================================================
-- Bật RLS
-- =====================================================================
alter table public.users          enable row level security;
alter table public.companies      enable row level security;
alter table public.company_members enable row level security;
alter table public.invitations    enable row level security;
alter table public.user_profiles  enable row level security;
alter table public.senders        enable row level security;
alter table public.receivers      enable row level security;
alter table public.beneficiaries  enable row level security;
alter table public.orders         enable row level security;
alter table public.transactions   enable row level security;
alter table public.activity_logs  enable row level security;

-- users: chính mình
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());

-- user_profiles: chính mình
drop policy if exists profiles_owner on public.user_profiles;
create policy profiles_owner on public.user_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- companies: chỉ công ty của mình; admin được sửa
drop policy if exists companies_member_read on public.companies;
create policy companies_member_read on public.companies
  for select using (id = public.current_company_id());
drop policy if exists companies_admin_update on public.companies;
create policy companies_admin_update on public.companies
  for update using (id = public.current_company_id() and public.is_company_admin())
  with check (id = public.current_company_id() and public.is_company_admin());

-- company_members: thấy thành viên cùng công ty; admin xoá được người khác
drop policy if exists members_read on public.company_members;
create policy members_read on public.company_members
  for select using (company_id = public.current_company_id());
drop policy if exists members_admin_delete on public.company_members;
create policy members_admin_delete on public.company_members
  for delete using (
    company_id = public.current_company_id()
    and public.is_company_admin()
    and user_id <> auth.uid()
  );
-- (thêm thành viên chỉ qua RPC create_company / accept_invitation)

-- invitations: admin quản lý của công ty mình; người được mời xem lời mời theo email
drop policy if exists invitations_admin on public.invitations;
create policy invitations_admin on public.invitations
  for all using (company_id = public.current_company_id() and public.is_company_admin())
  with check (company_id = public.current_company_id() and public.is_company_admin());
drop policy if exists invitations_invitee_read on public.invitations;
create policy invitations_invitee_read on public.invitations
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------------
-- Mẫu policy theo công ty cho dữ liệu nghiệp vụ
-- ---------------------------------------------------------------------
drop policy if exists senders_owner on public.senders;
drop policy if exists senders_company on public.senders;
create policy senders_company on public.senders
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id() and user_id = auth.uid());

drop policy if exists receivers_owner on public.receivers;
drop policy if exists receivers_company on public.receivers;
create policy receivers_company on public.receivers
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id() and user_id = auth.uid());

drop policy if exists beneficiaries_owner on public.beneficiaries;
drop policy if exists beneficiaries_company on public.beneficiaries;
create policy beneficiaries_company on public.beneficiaries
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id() and user_id = auth.uid());

drop policy if exists orders_owner on public.orders;
drop policy if exists orders_company on public.orders;
create policy orders_company on public.orders
  for all using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id() 
    and user_id = auth.uid()
    and received_by_user_id = auth.uid()
  );

drop policy if exists transactions_owner on public.transactions;
drop policy if exists transactions_company on public.transactions;
create policy transactions_company on public.transactions
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id() and user_id = auth.uid());

drop policy if exists activity_owner on public.activity_logs;
drop policy if exists activity_company on public.activity_logs;
create policy activity_company on public.activity_logs
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id() and user_id = auth.uid());

-- =====================================================================
-- Trigger: tạo public.users + user_profiles khi có user mới
-- (KHÔNG tự tạo công ty — người dùng chọn ở bước onboarding)
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.user_profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Cài đặt công ty (cho trang Settings) — bổ sung cột, không phá dữ liệu
-- =====================================================================
alter table public.companies add column if not exists logo_url         text;
alter table public.companies add column if not exists address          text;
alter table public.companies add column if not exists phone            text;
alter table public.companies add column if not exists receipt_header   text;
alter table public.companies add column if not exists receipt_footer   text;
alter table public.companies add column if not exists default_currency text default 'USD';

-- =====================================================================
-- BỔ SUNG: thương hiệu công ty + trường địa lý (Country/State/City)
-- Tất cả đều additive (add column if not exists) -> không phá dữ liệu cũ.
-- =====================================================================
alter table public.companies add column if not exists address       text;
alter table public.companies add column if not exists phone         text;
alter table public.companies add column if not exists logo_url      text;
alter table public.companies add column if not exists currency      text default 'USD';
alter table public.companies add column if not exists receipt_footer text;

-- Sender: thêm country (đã có zip, city, state, address)
alter table public.senders   add column if not exists country text default 'United States';

-- Receiver: thêm country, state, city, zip (đã có province, address)
alter table public.receivers add column if not exists country text default 'Vietnam';
alter table public.receivers add column if not exists state   text;
alter table public.receivers add column if not exists city    text;
alter table public.receivers add column if not exists zip     text;

-- =====================================================================
-- Cột bổ sung cho orders: % thuế / % phí giao dịch + số tiền tính ra,
-- và thông tin "Khách hàng lớn / Major Customer". (xem migrations/)
-- =====================================================================
alter table public.orders add column if not exists tax_percent             numeric(9,4) not null default 0;
alter table public.orders add column if not exists transaction_fee_percent numeric(9,4) not null default 0;
alter table public.orders add column if not exists tax_amount              numeric(18,2) not null default 0;
alter table public.orders add column if not exists transaction_fee_amount  numeric(18,2) not null default 0;

-- =====================================================================
-- BN Logistics: cột bổ sung cho orders (xem migrations/2026-06-orders-bnlogistics.sql)
-- =====================================================================
alter table public.orders add column if not exists sender_note      text;
alter table public.orders add column if not exists receive_method   text;
alter table public.orders add column if not exists payout_address   text;
alter table public.orders add column if not exists receive_currency text not null default 'VND';
alter table public.orders add column if not exists total_amount     numeric(18,2) not null default 0;

-- Nạp lại schema cache cho PostgREST sau khi thêm cột
alter table public.orders add column if not exists employee text;

-- =====================================================================
-- 2026-07: Thêm received_by_user_id + received_by_employee_name
-- (lưu ID nhân viên + tên nhân viên tại thời điểm tạo đơn)
-- =====================================================================
alter table public.orders add column if not exists received_by_user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists received_by_employee_name text;
create index if not exists orders_received_by_user_idx on public.orders(received_by_user_id);

notify pgrst, 'reload schema';
