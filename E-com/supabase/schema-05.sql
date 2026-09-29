-- Phase 5: speed — composite indexes for rail filters, FK coverage,
-- one-query product_cards view, fresh planner stats. All idempotent.

create index if not exists products_brand_created_idx
  on products (brand, created_at desc);
create index if not exists products_collection_created_idx
  on products (collection, created_at desc);
create index if not exists products_category_idx
  on products (category_id);
create index if not exists reviews_product_created_idx
  on reviews (product_id, created_at desc);

-- One round-trip for every product rail/card: product + thumbnail +
-- from-price + category handle. No N+1, no over-fetch.
create or replace view product_cards as
select
  p.id, p.handle, p.title, p.description,
  coalesce(p.thumbnail_webp, '') as thumbnail,
  p.brand, p.collection, p.tags, p.colors, p.badges,
  p.rating, p.review_count, p.created_at,
  c.handle as category_handle,
  (select min(v.price_inr) from variants v where v.product_id = p.id) as min_price_inr,
  (select count(*) from product_images i where i.product_id = p.id) as image_count
from products p
left join categories c on c.id = p.category_id;

analyze products;
analyze product_images;
analyze variants;
analyze reviews;
analyze categories;
analyze orders;
