/**
 * Returns the next value of a named counter. The update takes a row lock, so concurrent
 * transactions wait their turn and can never receive the same number.
 */
async function next(tx, name, startAt) {
  const row = await tx.sequence.upsert({
    where: { name },
    update: { value: { increment: 1 } },
    create: { name, value: startAt },
  })
  return row.value
}

export async function nextSaleNumber(tx) {
  return `INV-${await next(tx, 'sale', 1001)}`
}

export async function nextPoNumber(tx) {
  const value = await next(tx, 'purchase', 1)
  return `PO-${new Date().getFullYear()}-${String(value).padStart(3, '0')}`
}
