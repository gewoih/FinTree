import { reactive, onMounted, onUnmounted } from 'vue'

interface ChartColors {
  text: string
  grid: string
  tooltipBg: string
  tooltipText: string
  tooltipSecondary: string
  tooltipBorder: string
  palette: string[]
  // Ordered for max adjacent-hue contrast in sorted donut/pie charts.
  // Colors are invariant between themes (not overridden in .light-mode).
  categoryPalette: string[]
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

// Ordered for maximum adjacent-hue contrast in a sorted donut chart.
// All colors target ~45–65% lightness so they have consistent visual weight
// at any slice size. Pale UI-accent colors (primary-400 olive) are intentionally
// excluded — those are for interactive elements, not large chart fills.
// Hue sequence: 88° → 200° → 4° → 150° → 42° → 270° → 192° → 330° → 0° → 220°
const CATEGORY_PALETTE: string[] = [
  '#488FA7', // ft-info-500      teal-blue   ~200°  — best large-fill color in the set
  '#8FAA58', // ft-primary-600   olive-green  ~88°  — brand, prominent as 2nd slice
  '#C94139', // ft-danger-600    deep red      ~4°
  '#2FC470', // ft-success-500   green        ~150°
  '#BC8F30', // ft-warning-500   dark amber    ~42°
  '#9B7FD4', // purple           violet       ~270°
  '#66C2D9', // ft-chart-2       cyan         ~192°
  '#C4689A', // rose-pink                     ~330°
  '#D0A271', // ft-orange-300    warm sand     ~30°
  '#3A748A', // ft-info-600      deep teal    ~200°  (darker, distinguishable from info-500)
]

function resolveColors(): ChartColors {
  if (typeof window === 'undefined') {
    return {
      text:             'var(--ft-chart-text)',
      grid:             'var(--ft-chart-grid)',
      tooltipBg:        'var(--ft-chart-tooltip-bg)',
      tooltipText:      'var(--ft-chart-tooltip-text)',
      tooltipSecondary: 'var(--ft-chart-tooltip-secondary)',
      tooltipBorder:    'var(--ft-chart-tooltip-border)',
      palette:          ['var(--ft-chart-1)', 'var(--ft-chart-2)', 'var(--ft-chart-3)', 'var(--ft-chart-4)', 'var(--ft-chart-5)'],
      categoryPalette:  CATEGORY_PALETTE,
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
    palette:          [r('--ft-chart-1'), r('--ft-chart-2'), r('--ft-chart-3'), r('--ft-chart-4'), r('--ft-chart-5')].filter(Boolean),
    categoryPalette:  CATEGORY_PALETTE,
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
