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
  accent: string
  surface: string
}

const DEFAULT_PALETTE = [
  'var(--ft-chart-1)',
  'var(--ft-chart-2)',
  'var(--ft-chart-3)',
  'var(--ft-chart-4)',
  'var(--ft-chart-5)',
] as const

function readToken(styles: CSSStyleDeclaration, token: string): string {
  return styles.getPropertyValue(token).trim()
}

function resolveColors(): ChartColors {
  const defaults = getDefaults()

  if (typeof window === 'undefined') {
    return defaults
  }

  const s = getComputedStyle(document.documentElement)

  const text = readToken(s, '--ft-chart-text') || readToken(s, '--ft-text-secondary') || defaults.text
  const grid = readToken(s, '--ft-chart-grid') || readToken(s, '--ft-border-subtle') || defaults.grid
  const tooltipBg = readToken(s, '--ft-chart-tooltip-bg') || readToken(s, '--ft-surface-raised') || defaults.tooltipBg
  const tooltipText =
    readToken(s, '--ft-chart-tooltip-text') || readToken(s, '--ft-text-primary') || defaults.tooltipText
  const tooltipSecondary =
    readToken(s, '--ft-chart-tooltip-secondary') || readToken(s, '--ft-text-secondary') || defaults.tooltipSecondary
  const tooltipBorder =
    readToken(s, '--ft-chart-tooltip-border') || readToken(s, '--ft-border-default') || defaults.tooltipBorder
  const risk = readToken(s, '--ft-chart-risk') || readToken(s, '--ft-orange-500') || defaults.risk
  const expense = readToken(s, '--ft-chart-expense') || readToken(s, '--ft-warning-400') || defaults.expense
  const actual = readToken(s, '--ft-chart-actual') || readToken(s, '--ft-chart-2') || defaults.actual
  const forecast = readToken(s, '--ft-chart-forecast') || readToken(s, '--ft-chart-1') || defaults.forecast
  const optimistic = readToken(s, '--ft-chart-optimistic') || readToken(s, '--ft-chart-3') || defaults.optimistic
  const baseline = readToken(s, '--ft-chart-baseline') || readToken(s, '--ft-text-tertiary') || defaults.baseline
  const primary = readToken(s, '--ft-chart-1') || readToken(s, '--ft-primary-400') || defaults.primary
  const accent = readToken(s, '--ft-chart-2') || readToken(s, '--ft-info-400') || defaults.accent
  const surface = readToken(s, '--ft-surface-base') || defaults.surface

  const palette = [
    readToken(s, '--ft-chart-1') || primary,
    readToken(s, '--ft-chart-2') || accent,
    readToken(s, '--ft-chart-3') || readToken(s, '--ft-success-400') || DEFAULT_PALETTE[2],
    readToken(s, '--ft-chart-4') || readToken(s, '--ft-orange-400') || DEFAULT_PALETTE[3],
    readToken(s, '--ft-chart-5') || readToken(s, '--ft-warning-400') || DEFAULT_PALETTE[4],
  ].filter(Boolean)

  return {
    text,
    grid,
    tooltipBg,
    tooltipText,
    tooltipSecondary,
    tooltipBorder,
    palette: palette.length ? palette : defaults.palette,
    risk,
    expense,
    actual,
    forecast,
    optimistic,
    baseline,
    primary,
    accent,
    surface,
  }
}

function getDefaults(): ChartColors {
  return {
    text: 'var(--ft-chart-text)',
    grid: 'var(--ft-chart-grid)',
    tooltipBg: 'var(--ft-chart-tooltip-bg)',
    tooltipText: 'var(--ft-chart-tooltip-text)',
    tooltipSecondary: 'var(--ft-chart-tooltip-secondary)',
    tooltipBorder: 'var(--ft-chart-tooltip-border)',
    palette: [...DEFAULT_PALETTE],
    risk: 'var(--ft-chart-risk)',
    expense: 'var(--ft-chart-expense)',
    actual: 'var(--ft-chart-actual)',
    forecast: 'var(--ft-chart-forecast)',
    optimistic: 'var(--ft-chart-optimistic)',
    baseline: 'var(--ft-chart-baseline)',
    primary: 'var(--ft-chart-1)',
    accent: 'var(--ft-chart-2)',
    surface: 'var(--ft-surface-base)',
  }
}

export function useChartColors() {
  const colors = reactive<ChartColors>(resolveColors())
  let observer: MutationObserver | null = null

  function refresh() {
    const resolved = resolveColors()
    Object.assign(colors, resolved)
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

  return {
    colors,
    refresh,
    tooltipConfig,
  }
}
