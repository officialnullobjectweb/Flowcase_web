-- Phase 11: CMS + operations — review replies/moderation, real customer records,
-- newsletter subscribers, homepage sections (storefront renders these), low-stock
-- and review notifications, TOTP 2FA storage, stock-adjustment audit trail, and
-- the 7-day archive (copy-then-delete; purged lazily by the admin).

/* ── reviews: moderation + public reply ── */
alter table reviews
  add column if not exists reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved', 'hidden'));

-- storefront may only read approved reviews (admin reads via service-role)
drop policy if exists "public read" on reviews;
create policy "public read" on reviews for select using (status = 'approved');

/* ── customers: editable records (checkout upserts, admin edits) ── */
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  phone text not null default '',
  tags text[] not null default '{}',
  notes text not null default '',
  marketing_opt_in boolean not null default false,
  last_order_at timestamptz,
  created_at timestamptz not null default now()
);
alter table customers enable row level security;
-- no public policies: service-role only.

-- seed from existing orders (idempotent; refreshes last_order_at, fills blanks)
insert into customers (email, name, phone, last_order_at)
select distinct on (o.email) o.email, o.name, o.phone, o.created_at
from orders o where o.email <> ''
order by o.email, o.created_at desc
on conflict (email) do update
  set last_order_at = greatest(coalesce(customers.last_order_at, 'epoch'::timestamptz), excluded.last_order_at),
      name   = case when customers.name  = '' then excluded.name  else customers.name  end,
      phone  = case when customers.phone = '' then excluded.phone else customers.phone end;

/* ── newsletter subscribers ── */
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'storefront',
  tags text[] not null default '{}',
  unsubscribed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table subscribers enable row level security;
drop policy if exists "newsletter signup" on subscribers;
create policy "newsletter signup" on subscribers for insert with check (true);
-- no SELECT policy: emails are private (admin reads via service-role).

/* ── homepage sections (order/visibility the storefront renders) ── */
create table if not exists home_sections (
  key text primary key,
  title text not null default '',
  enabled boolean not null default true,
  position integer not null default 0,
  layout text not null default 'grid' check (layout in ('grid', 'rail', 'banner')),
  rule text not null default 'manual'
    check (rule in ('manual', 'newest', 'best_seller', 'top_rated', 'category')),
  category_handle text not null default '',
  product_ids uuid[] not null default '{}',
  limit_count integer not null default 8 check (limit_count between 1 and 24),
  updated_at timestamptz not null default now()
);
alter table home_sections enable row level security;
drop policy if exists "public read" on home_sections;
create policy "public read" on home_sections for select using (true);

-- seed mirrors the storefront's current hardcoded order (on conflict: keep admin edits)
insert into home_sections (key, title, position, layout, rule, limit_count) values
  ('best_sellers',   'Best sellers',      1,  'rail',   'best_seller', 8),
  ('categories',     'Shop by category',  2,  'grid',   'manual',      12),
  ('models',         'Shop by model',     3,  'grid',   'manual',      12),
  ('just_landed',    'Just landed',       4,  'rail',   'newest',      8),
  ('this_month',     'This month',        5,  'banner', 'manual',      6),
  ('sustainability', 'Built to last',     6,  'grid',   'manual',      4),
  ('collections',    'Collections',       7,  'grid',   'manual',      8),
  ('reviews',        'Reviews',           8,  'grid',   'manual',      8),
  ('best_rated',     'Best rated',        9,  'rail',   'top_rated',   8),
  ('the_standard',   'The standard',      10, 'grid',   'manual',      4),
  ('reuse',          'Reuse programme',   11, 'grid',   'manual',      4),
  ('cta_newsletter', 'Ready when you are', 12, 'grid',   'manual',      4)
on conflict (key) do nothing;

/* ── notification triggers: low stock + new review ── */
create or replace function fn_notify_low_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  thr integer;
  p_title text;
begin
  select coalesce((value ->> 'low_stock_threshold')::int, 10) into thr
  from site_settings where key = 'ops';
  if thr is null then thr := 10; end if;
  if new.inventory_qty > thr or old.inventory_qty <= thr then return new; end if;
  select title into p_title from products where id = new.product_id;
  if exists (
    select 1 from notifications
    where type = 'low_stock' and read_at is null
      and href = '/products/' || new.product_id
  ) then return new; end if;
  insert into notifications (type, title, body, href)
  values ('low_stock',
          coalesce(p_title, 'Product') || ' is low on stock',
          new.inventory_qty || ' left · ' || new.title,
          '/products/' || new.product_id);
  return new;
end $$;

drop trigger if exists trg_variants_low_stock on variants;
create trigger trg_variants_low_stock after update of inventory_qty on variants
for each row execute function fn_notify_low_stock();

create or replace function fn_notify_new_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (type, title, body, href)
  values ('review',
          'New review — ' || new.name,
          new.rating || '★ · ' || coalesce(nullif(new.title, ''), left(new.body, 60)),
          '/reviews');
  return new;
end $$;

drop trigger if exists trg_reviews_notify on reviews;
create trigger trg_reviews_notify after insert on reviews
for each row execute function fn_notify_new_review();

/* ── TOTP 2FA (single admin, secret AES-encrypted by the app) ── */
create table if not exists admin_totp (
  id integer primary key check (id = 1),
  secret_encrypted text not null default '',
  confirmed boolean not null default false,
  backup_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table admin_totp enable row level security;
insert into admin_totp (id) values (1) on conflict (id) do nothing;

/* ── stock adjustment audit ── */
create table if not exists stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references variants(id) on delete cascade,
  delta integer not null,
  reason text not null default '',
  actor text not null default 'admin',
  created_at timestamptz not null default now()
);
alter table stock_adjustments enable row level security;
create index if not exists stock_adjustments_variant_idx
  on stock_adjustments (variant_id, created_at desc);

/* ── archive: deleted content kept for 7 days, then purged lazily ── */
create table if not exists archive (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('product', 'category', 'coupon', 'review')),
  entity_id uuid not null,
  payload jsonb not null,
  purge_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
alter table archive enable row level security;
create index if not exists archive_purge_idx on archive (purge_at);
create index if not exists archive_type_idx on archive (entity_type, created_at desc);

notify pgrst, 'reload schema';
