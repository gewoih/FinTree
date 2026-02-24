export interface EvolutionDeltaPoint<TMonth> {
  currentMonth: TMonth
  currentValue: number
  previousMonth: TMonth | null
  previousValue: number | null
  delta: number | null
}

export function resolveLatestDeltaPoint<TMonth>(
  months: readonly TMonth[],
  readValue: (month: TMonth) => number | null
): EvolutionDeltaPoint<TMonth> | null {
  let current: { month: TMonth; value: number } | null = null
  let previous: { month: TMonth; value: number } | null = null

  for (let index = months.length - 1; index >= 0; index -= 1) {
    const month = months.at(index)
    if (!month) continue

    const value = readValue(month)
    if (value == null || Number.isNaN(value)) continue

    if (!current) {
      current = { month, value }
      continue
    }

    previous = { month, value }
    break
  }

  if (!current) return null

  return {
    currentMonth: current.month,
    currentValue: current.value,
    previousMonth: previous?.month ?? null,
    previousValue: previous?.value ?? null,
    delta: previous ? current.value - previous.value : null,
  }
}
