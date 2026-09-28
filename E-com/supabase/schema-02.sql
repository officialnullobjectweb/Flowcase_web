-- Phase 2: orders (server-created only) + login throttle log.
-- Service-role key only; NO public policies (anon cannot read or write).

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  phone text not null default '',
  address jsonb not null default '{}',
  items jsonb not null default '[]',
  subtotal integer not null default 0,
  shipping integer not null default 0,
  total integer not null default 0,
  currency text not null default 'inr',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  razorpay_order_id text not null default '',
  razorpay_payment_id text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_email_idx on orders (email);

create table if not exists login_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  success boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_ip_idx on login_attempts (ip, attempted_at desc);

alter table orders enable row level security;
alter table login_attempts enable row level security;
-- intentionally NO policies: only the service-role key (Worker) touches these.
