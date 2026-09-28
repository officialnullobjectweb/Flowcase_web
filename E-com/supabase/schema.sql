-- Flowcase serverless catalog — Phase 1 (products, variants, categories, reviews).
-- Applied with the pooler URL. Safe to re-run (IF NOT EXISTS everywhere).

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  handle text not null unique,
  description text not null default '',
  collection text not null default 'accessories'
    check (collection in ('iphone', 'samsung', 'accessories')),
  brand text not null default 'accessory'
    check (brand in ('apple', 'samsung', 'accessory')),
  tags text[] not null default '{}',
  colors text[] not null default '{}',
  badges text not null default '',
  rating numeric not null default 0,
  review_count integer not null default 0,
  thumbnail_webp text,
  category_id uuid references categories (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists products_handle_idx on products (handle);
create index if not exists products_brand_idx on products (brand);
create index if not exists products_collection_idx on products (collection);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  position integer not null default 0,
  unique (product_id, position)
);
create index if not exists product_images_product_idx on product_images (product_id);

create table if not exists variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  title text not null,
  sku text not null unique,
  price_inr integer not null,
  price_usd integer not null,
  inventory_qty integer not null default 100,
  created_at timestamptz not null default now()
);
create index if not exists variants_product_idx on variants (product_id);
create index if not exists variants_sku_idx on variants (sku);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  name text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  verified boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on reviews (product_id);

-- Evolutions for tables that may already exist (idempotent).
alter table products add column if not exists thumbnail_webp text;

-- Public read for the storefront (anon key); writes go through the Worker
-- with the service-role key, never from the browser.
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table variants enable row level security;
alter table reviews enable row level security;

drop policy if exists "public read" on categories;
create policy "public read" on categories for select using (true);
drop policy if exists "public read" on products;
create policy "public read" on products for select using (true);
drop policy if exists "public read" on product_images;
create policy "public read" on product_images for select using (true);
drop policy if exists "public read" on variants;
create policy "public read" on variants for select using (true);
drop policy if exists "public read" on reviews;
create policy "public read" on reviews for select using (true);
