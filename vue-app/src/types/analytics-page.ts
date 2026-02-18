export type MonthPickerInstance = {
  show?: () => void
  hide?: () => void
}

export interface PeakDayItem {
  label: string
  amount: number
  amountLabel: string
  date: Date
  shareLabel: string
}
