import { reactive, onMounted, onUnmounted } from 'vue'

interface ChartColors {
  text: string
  grid: string
  tooltipBg: string
  tooltipText: string
  tooltipSecondary: string
  tooltipBorder: string
  palette: string[]
  risk: string
  expense: string
  actual: string
  forecast: string
  optimistic: string
  baseline: string
  primary: string
  surface: string
}

function readToken(styles: CSSStyleDeclaration, token: string): string {
  return styles.getPropertyValue(token).trim()
}

function resolveColors(): ChartColors {
  if (typeof window === 'undefined') {
    return {
      text:             'var(--ft-chart-text)',
      grid:             'var(--ft-chart-grid)',
      tooltipBg:        'var(--ft-chart-tooltip-bg)',
      tooltipText:      'var(--ft-chart-tooltip-text)',
      tooltipSecondary: 'var(--ft-chart-tooltip-secondary)',
      tooltipBorder:    'var(--ft-chart-tooltip-border)',
      palette:    ['var(--ft-chart-1)', 'var(--ft-chart-2)', 'var(--ft-chart-3)', 'var(--ft-chart-4)', 'var(--ft-chart-5)'],
      risk:       'var(--ft-chart-risk)',
      expense:    'var(--ft-chart-expense)',
      actual:     'var(--ft-chart-1)',
      forecast:   'var(--ft-chart-forecast)',
      optimistic: 'var(--ft-chart-optimistic)',
      baseline:   'var(--ft-chart-baseline)',
      primary:    'var(--ft-chart-1)',
      surface:    'var(--ft-surface-base)',
    }
  }

  const s = getComputedStyle(document.documentElement)
  const r = (t: string) => readToken(s, t)

  return {
    text:             r('--ft-chart-text'),
    grid:             r('--ft-chart-grid'),
    tooltipBg:        r('--ft-chart-tooltip-bg'),
    tooltipText:      r('--ft-chart-tooltip-text'),
    tooltipSecondary: r('--ft-chart-tooltip-secondary'),
    tooltipBorder:    r('--ft-chart-tooltip-border'),
    palette:    [r('--ft-chart-1'), r('--ft-chart-2'), r('--ft-chart-3'), r('--ft-chart-4'), r('--ft-chart-5')].filter(Boolean),
    risk:       r('--ft-chart-risk'),
    expense:    r('--ft-chart-expense'),
    actual:     r('--ft-chart-1'),
    forecast:   r('--ft-chart-forecast'),
    optimistic: r('--ft-chart-optimistic'),
    baseline:   r('--ft-chart-baseline'),
    primary:    r('--ft-chart-1'),
    surface:    r('--ft-surface-base'),
  }
}

export function useChartColors() {
  const colors = reactive<ChartColors>(resolveColors())
  let observer: MutationObserver | null = null

  function refresh() {
    Object.assign(colors, resolveColors())
  }

  onMounted(() => {
    refresh()
    observer = new MutationObserver(refresh)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  function tooltipConfig() {
    return {
      backgroundColor: colors.tooltipBg,
      titleColor: colors.tooltipText,
      bodyColor: colors.tooltipSecondary,
      borderColor: colors.tooltipBorder,
      borderWidth: 1,
      cornerRadius: 10,
      padding: 12,
    }
  }

  return { colors, refresh, tooltipConfig }
}
