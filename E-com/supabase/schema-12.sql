-- Per-product Highlights (features) + Feature banners, edited from the
-- admin product form; rendered by the storefront PDP.
alter table products add column if not exists highlights jsonb;
alter table products add column if not exists feature_banners jsonb;
