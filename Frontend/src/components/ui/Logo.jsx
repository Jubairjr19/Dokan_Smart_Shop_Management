/** The Dokan storefront mark: a shop with the orange striped roof from the SRS cover. */
export function LogoMark({ className = 'h-11 w-11' }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center rounded-[28%] border border-white/25 bg-white/10 shadow-[0_8px_24px_-8px_rgba(249,115,22,.65),inset_0_1px_0_rgba(255,255,255,.3)] backdrop-blur ${className}`}>
      <svg viewBox="0 0 48 48" fill="none" className="h-[72%] w-[72%]" aria-hidden="true">
        <rect x="9" y="20" width="30" height="21" rx="2.500" fill="#F1F5FB" />
        <rect x="13" y="27" width="9" height="14" rx="1.200" fill="#0E1630" />
        <rect x="26" y="27" width="9" height="7.500" rx="1.200" fill="#22D3EE" />
        <path d="M11 7h26l6 13.200a4.800 4.800 0 0 1-9.500 1 4.800 4.800 0 0 1-9.500 0 4.800 4.800 0 0 1-9.500 0 4.800 4.800 0 0 1-9.500-1L11 7Z" fill="#F97316" />
        <path d="M19 7h10l1.500 14.200a4.800 4.800 0 0 1-6.500 0 4.800 4.800 0 0 1-6.500 0L19 7Z" fill="#fff" fillOpacity=".92" />
      </svg>
    </span>
  )
}

export function Wordmark({ className = 'text-2xl' }) {
  return (
    <span className={`font-extrabold tracking-tight text-frost ${className}`}>
      Dokan<span className="text-brand-orange">.</span>
    </span>
  )
}
