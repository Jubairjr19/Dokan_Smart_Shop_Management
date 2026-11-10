/** Amounts are stored as floats, so every result is rounded to avoid values like 0.30000000000000004. */
export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

export const taka = (value) => `৳ ${round2(value).toLocaleString('en-US')}`
