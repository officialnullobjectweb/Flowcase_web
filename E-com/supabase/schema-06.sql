-- Coupons: admin-managed discounts (replaces the hardcoded REUSE10).
-- Percent validated server-side at order time; clients never decide pricing.

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent integer not null check (percent between 1 and 90),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table coupons enable row level security;
-- no policies: service-role (Worker) only.

insert into coupons (code, percent) values ('REUSE10', 10)
on conflict (code) do update set percent = excluded.percent, active = true;
