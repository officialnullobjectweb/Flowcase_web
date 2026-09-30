export interface CalculatedPrice {
  calculated_amount: number | null
  original_amount: number | null
  currency_code: string | null
}

export interface VariantOptionValue {
  id: string
  option_id?: string
  value: string
}

export interface ProductVariant {
  id: string
  title: string | null
  sku?: string | null
  inventory_quantity?: number
  manage_inventory?: boolean
  allow_backorder?: boolean
  calculated_price?: CalculatedPrice | null
  options?: VariantOptionValue[]
}

export interface ProductOptionValue {
  id: string
  value: string
}

export interface ProductOption {
  id: string
  title: string
  values: ProductOptionValue[]
}

export interface ProductImage {
  id: string
  url: string
  alt?: string | null
}

export interface ProductTag {
  id?: string
  value: string
}

export interface ProductCategory {
  id: string
  handle: string
  name: string
}

export interface Product {
  id: string
  title: string
  handle: string
  description?: string | null
  thumbnail?: string | null
  collection_id?: string | null
  images?: ProductImage[]
  tags?: ProductTag[]
  options?: ProductOption[]
  metadata?: Record<string, string | number | null> | null
  highlights?: { term: string; detail: string }[] | null
  featureBanners?: { eyebrow: string; title: string; copy: string; image: string }[] | null
  variants: ProductVariant[]
}

export interface Collection {
  id: string
  title: string
  handle?: string | null
}

export interface Region {
  id: string
  currency_code: string
}

export interface Address {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string | null
  city?: string
  postal_code?: string
  country_code?: string
  province?: string | null
  phone?: string | null
}

export interface LineItem {
  id: string
  variant_id?: string
  quantity: number
  unit_price: number
  subtotal?: number | null
  product_title?: string | null
  variant_title?: string | null
  thumbnail?: string | null
}

export interface ShippingMethod {
  id?: string
  shipping_option_id?: string
  name?: string
  amount?: number | null
}

export interface Cart {
  id: string
  email?: string | null
  currency_code: string
  subtotal?: number | null
  shipping_total?: number | null
  tax_total?: number | null
  total?: number | null
  items?: LineItem[]
  shipping_address?: Address | null
  shipping_methods?: ShippingMethod[]
}

export interface ShippingOption {
  id: string
  name: string
  price_type: "flat" | "calculated"
  amount: number
}

export interface Order {
  id: string
  display_id?: number
  email?: string | null
}

export interface Customer {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

export interface LocalCartItem {
  id: string
  productId: string
  title: string
  variantTitle: string | null
  handle: string
  thumbnail: string | null
  unitPrice: number
  currency: string
  quantity: number
}
