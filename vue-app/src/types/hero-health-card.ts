export type MetricAccent = 'good' | 'average' | 'poor' | 'neutral' | 'income' | 'expense'

export interface HealthTile {
  key: string
  label: string
  value: string
  meta?: string | null
  tooltip?: string
  icon: string
  accent?: MetricAccent
}

export interface PeakDayItem {
  label: string
  amountLabel: string
  amount: number
  date: Date
  shareLabel: string
}

export interface PeaksSummary {
  count: number
  totalLabel: string
  shareLabel: string
  shareValue: number | null
  monthLabel: string
}

export interface HealthGroup {
  key: string
  title: string
  metrics: HealthTile[]
  accent?: MetricAccent
}
