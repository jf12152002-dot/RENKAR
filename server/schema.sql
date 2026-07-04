-- RENKAR production schema
-- Run this in PostgreSQL before pointing DATABASE_URL to production.

create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('user', 'admin', 'admin_recharges', 'admin_withdrawals', 'supervisor')),
  joined_at timestamptz not null default now(),
  referral_code text not null unique,
  referred_by text references users(id) on delete set null,
  bank_methods jsonb not null default '[]'::jsonb,
  blocked boolean not null default false
);

create table if not exists plans (
  id text primary key,
  name text not null,
  amount numeric not null check (amount > 0),
  daily_profit numeric not null check (daily_profit > 0),
  roi_percent numeric not null check (roi_percent > 0),
  duration_days integer not null check (duration_days > 0)
);

create table if not exists payment_accounts (
  id text primary key,
  bank text not null,
  account_holder text not null,
  account_number text not null,
  account_type text not null,
  active boolean not null default true
);

create table if not exists recharges (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  plan_id text references plans(id) on delete restrict,
  bank_name text not null,
  reference_number text,
  amount numeric not null check (amount > 0),
  transfer_date text not null,
  receipt_name text,
  receipt_data_url text,
  status text not null check (status in ('Pendiente de validacion', 'Aprobada', 'Rechazada')),
  created_at timestamptz not null default now()
);

create table if not exists investments (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  plan_id text not null references plans(id) on delete restrict,
  amount numeric not null check (amount > 0),
  daily_profit numeric not null check (daily_profit > 0),
  duration_days integer not null check (duration_days > 0),
  started_at timestamptz not null default now(),
  active boolean not null default true,
  recharge_id text unique references recharges(id) on delete restrict
);

create table if not exists withdrawals (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  bank text not null,
  account_holder text not null,
  account_number text not null,
  account_type text not null,
  amount numeric not null check (amount > 0),
  status text not null check (status in ('Pendiente', 'Aprobado', 'Rechazado', 'Pagado')),
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  name text not null,
  registered_at timestamptz not null default now(),
  status text not null check (status in ('Activo', 'Pendiente')),
  invested_amount numeric not null default 0 check (invested_amount >= 0)
);

create table if not exists movements (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  type text not null,
  amount numeric not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists gift_codes (
  id text primary key,
  code text not null unique,
  amount numeric not null check (amount > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists gift_redemptions (
  gift_code_id text not null references gift_codes(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (gift_code_id, user_id)
);

create table if not exists support_messages (
  id text primary key,
  user_id text references users(id) on delete cascade,
  sender text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_logs (
  id text primary key,
  admin_user_id text references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_email on users(email);
create index if not exists idx_users_referral_code on users(referral_code);
create index if not exists idx_recharges_status_created on recharges(status, created_at desc);
create index if not exists idx_recharges_user on recharges(user_id);
create index if not exists idx_withdrawals_status_created on withdrawals(status, created_at desc);
create index if not exists idx_withdrawals_user_created on withdrawals(user_id, created_at desc);
create index if not exists idx_movements_user_created on movements(user_id, created_at desc);
create index if not exists idx_investments_user on investments(user_id);
create index if not exists idx_referrals_user on referrals(user_id);
create index if not exists idx_gift_codes_code on gift_codes(code);
create index if not exists idx_support_user_created on support_messages(user_id, created_at desc);
create index if not exists idx_admin_logs_created on admin_logs(created_at desc);
