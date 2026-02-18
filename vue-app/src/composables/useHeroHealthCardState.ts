import { computed, ref } from 'vue'
import type {
  HealthGroup,
  MetricAccent,
  PeakDayItem,
  PeaksSummary
} from '../types/hero-health-card'

type HeroHealthCardStateProps = {
  loading: boolean
  error: string | null
  groups: HealthGroup[]
  peaks: PeakDayItem[]
  peaksSummary: PeaksSummary
}

export function useHeroHealthCardState(props: HeroHealthCardStateProps) {
  const showEmpty = computed(() => {
    if (props.loading || props.error) return false
    const hasMetricData = props.groups.some(group => group.metrics.some(metric => metric.value !== '—'))
    return !hasMetricData && props.peaks.length === 0
  })

  const metricValueClass = (accent?: MetricAccent) =>
    accent ? `hero-card__metric-value--${accent}` : null

  const metricIconClass = (accent?: MetricAccent) =>
    accent ? `hero-card__metric-icon--${accent}` : null

  const peaksShareClass = computed(() => {
    const share = props.peaksSummary.shareValue
    if (share == null) return 'hero-card__peak-share--neutral'
    if (share <= 30) return 'hero-card__peak-share--good'
    if (share <= 50) return 'hero-card__peak-share--average'
    return 'hero-card__peak-share--poor'
  })

  const showAllPeaks = ref(false)

  const visiblePeaks = computed(() => {
    if (showAllPeaks.value) return props.peaks
    return props.peaks.slice(0, 3)
  })

  const hasMorePeaks = computed(() => props.peaks.length > 3)

  return {
    showEmpty,
    metricValueClass,
    metricIconClass,
    peaksShareClass,
    showAllPeaks,
    visiblePeaks,
    hasMorePeaks
  }
}
