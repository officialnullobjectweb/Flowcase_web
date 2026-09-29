-- Phase 8: orders — COD/pay-later vs razorpay, state for filters, coupon +
-- discount persistence, invoice numbers, shipped/delivered, internal notes.
-- Additive + idempotent (safe to re-run).

alter table orders
  add column if not exists payment_method text not null default 'razorpay'
    check (payment_method in ('razorpay', 'cod', 'manual')),
  add column if not exists coupon_code text not null default '',
  add column if not exists discount integer not null default 0 check (discount >= 0),
  add column if not exists state text not null default '',
  add column if not exists invoice_no integer,
  add column if not exists notes text not null default '';

-- status = payment lifecycle only; fulfilment lives in `state`
-- (reverts the earlier widen — nothing consumed shipped/delivered here)
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check check (
  status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')
);
alter table orders drop constraint if exists orders_state_check;
alter table orders add constraint orders_state_check check (
  state in ('', 'new', 'packing', 'shipped', 'delivered', 'returned')
);

create sequence if not exists orders_invoice_seq;

-- in-app notifications (populated by triggers below and in schema-11;
-- must exist before the order triggers can fire)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text not null default '',
  href text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
create index if not exists notifications_unread_idx
  on notifications (created_at desc) where read_at is null;

-- backfill: live orders default to the first fulfilment step (idempotent)
update orders set state = 'new'
where state = '' and status in ('pending', 'paid');

-- filter indexes
create index if not exists orders_payment_idx on orders (payment_method);
create index if not exists orders_state_idx on orders (state);
create index if not exists orders_status_created_idx on orders (status, created_at desc);
create index if not exists orders_coupon_idx on orders (coupon_code) where coupon_code <> '';

-- invoice number: assigned automatically when an order becomes paid (or COD/pay-later
-- at creation). BEFORE trigger keeps it out of the notification path.
create or replace function fn_assign_invoice() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.invoice_no := nextval('orders_invoice_seq');
  return new;
end $$;

drop trigger if exists trg_orders_invoice on orders;
create trigger trg_orders_invoice before insert or update on orders
for each row
when (new.invoice_no is null and (new.status = 'paid' or new.payment_method in ('cod', 'manual')))
execute function fn_assign_invoice();

-- in-app notifications (admin navbar). SECURITY DEFINER so any caller role works.
create or replace function fn_notify_new_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (type, title, body, href)
  values (
    'new_order',
    'New order — ' || coalesce(nullif(new.name, ''), new.email),
    '₹' || new.total || ' · ' || new.status || coalesce(' · ' || nullif(new.state, ''), ''),
    '/orders/' || new.id
  );
  return new;
end $$;

drop trigger if exists trg_orders_notify_insert on orders;
create trigger trg_orders_notify_insert after insert on orders
for each row
when (new.status = 'paid' or new.payment_method in ('cod', 'manual'))
execute function fn_notify_new_order();

drop trigger if exists trg_orders_notify_paid on orders;
create trigger trg_orders_notify_paid after update on orders
for each row
when (old.status <> 'paid' and new.status = 'paid')
execute function fn_notify_new_order();

notify pgrst, 'reload schema';
