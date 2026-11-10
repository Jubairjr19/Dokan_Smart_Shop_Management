import { productIcon } from '../../lib/productIcons.js'

const SIZES = { sm: 'h-8 w-8', md: 'h-10 w-10' }

export default function ProductAvatar({ product, size = 'md' }) {
  const Icon = productIcon(product)
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-brand-cyan ${SIZES[size]}`}>
      <Icon className="h-[46%] w-[46%]" aria-hidden="true" />
    </span>
  )
}
