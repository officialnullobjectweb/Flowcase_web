-- Phase 9: coupon engine — types (percent/fixed/BOGO/free-shipping), scope
-- (all/products/categories), validity window, redemption limits, state allowlist.
-- `percent` stays the source of truth for type=percent (back-compat with REUSE10);
-- `amount` is used for fixed ₹ off. All additive + idempotent.

alter table coupons
  add column if not exists type text not null default 'percent'
    check (type in ('percent', 'fixed', 'bogo', 'free_shipping')),
  add column if not exists amount integer not null default 0 check (amount >= 0),
  add column if not exists min_subtotal integer not null default 0 check (min_subtotal >= 0),
  add column if not exists max_discount integer not null default 0 check (max_discount >= 0),
  add column if not exists applies_to text not null default 'all'
    check (applies_to in ('all', 'products', 'categories')),
  add column if not exists product_ids uuid[] not null default '{}',
  add column if not exists category_ids uuid[] not null default '{}',
  add column if not exists states text[] not null default '{}',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists max_redemptions integer not null default 0 check (max_redemptions >= 0),
  add column if not exists per_user_limit integer not null default 0 check (per_user_limit >= 0),
  add column if not exists redemptions_used integer not null default 0 check (redemptions_used >= 0),
  add column if not exists bogo_buy_qty integer not null default 2 check (bogo_buy_qty >= 2),
  add column if not exists bogo_get_qty integer not null default 1 check (bogo_get_qty >= 1);

-- legacy check demanded percent >= 1; non-percent types legitimately use 0
alter table coupons drop constraint if exists coupons_percent_check;
alter table coupons add constraint coupons_percent_check check (percent between 0 and 90);

-- usage stats + active listing
create index if not exists coupons_active_idx on coupons (active, code);

notify pgrst, 'reload schema';
