-- Atomic stock decrement (called after verified payment).
-- Returns false when stock is insufficient — the order stays unpaid.
create or replace function decrement_stock(p_variant_id uuid, p_qty int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  left int;
begin
  update variants set inventory_qty = inventory_qty - p_qty
    where id = p_variant_id and inventory_qty >= p_qty
  returning inventory_qty into left;
  return found;
end;
$$;
