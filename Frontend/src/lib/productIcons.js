import { Candy, Cookie, Droplets, GlassWater, Leaf, Milk, Package, SprayCan, Wheat } from 'lucide-react'

const ICONS = {
  wheat: Wheat,
  oil: Droplets,
  sugar: Candy,
  milk: Milk,
  tea: Leaf,
  cookie: Cookie,
  detergent: SprayCan,
  water: GlassWater,
}

// New products have no icon of their own, so they borrow one from their category.
const CATEGORY_ICON = {
  Grains: 'wheat',
  Dairy: 'milk',
  Beverages: 'water',
  Snacks: 'cookie',
  Household: 'detergent',
}

export function productIcon(product) {
  return ICONS[product.icon] || ICONS[CATEGORY_ICON[product.category]] || Package
}
