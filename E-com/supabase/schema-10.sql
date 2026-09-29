-- Phase 10: catalog variations — structured variant options (Size/Colour/any axis),
-- compare-at (MRP) price, and a global option library the product form reads.
-- Storefront keeps working: it falls back to parsing variant.title when
-- options is empty.

alter table variants
  add column if not exists options jsonb not null default '{}',
  add column if not exists compare_at_inr integer check (compare_at_inr is null or compare_at_inr >= 0);

create index if not exists variants_options_idx on variants using gin (options);

-- global option axes ("Color" -> ['Black','Blue'], "Size" -> ['S','M','L'])
create table if not exists option_library (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  values text[] not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table option_library enable row level security;
drop policy if exists "public read" on option_library;
create policy "public read" on option_library for select using (true);
-- writes: service-role (admin server actions) only.

-- starter axes so the product form is useful on first run
insert into option_library (name, values, position) values
  ('Color', array['Black', 'White', 'Blue', 'Green', 'Red', 'Clear'], 0),
  ('Size', array['S', 'M', 'L', 'XL'], 1)
on conflict (name) do nothing;

notify pgrst, 'reload schema';
