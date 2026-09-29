-- Site settings: announcement bar + promo modal, edited from the admin panel.
-- Public read (content is displayed on the storefront); writes via Worker only.

create table if not exists site_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;
drop policy if exists "public read" on site_settings;
create policy "public read" on site_settings for select using (true);

insert into site_settings (key, value) values
  ('announcement', '{"enabled": true, "pages": ["home", "shop", "cart", "product"], "marquee": false, "speed": 24, "link": "", "messages": [{"text": "Free shipping over ₹999 · 7-day returns · 10% off with REUSE10", "link": ""}]}'),
  ('promo', '{"enabled": false, "image": "", "title": "10% off your first case", "body": "Use code REUSE10 at checkout.", "cta_label": "Shop cases", "cta_link": "/shop", "delay": 4}')
on conflict (key) do nothing;
