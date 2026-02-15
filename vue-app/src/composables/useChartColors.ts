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
  primary: string
  accent: string
  surface: string
}

function readToken(styles: CSSStyleDeclaration, token: string): string {
  return styles.getPropertyValue(token).trim()
}

function resolveColors(): ChartColors {
  if (typeof window === 'undefined') {
    return getDefaults()
  }

  const s = getComputedStyle(document.documentElement)

  const text = readToken(s, '--ft-chart-text') || readToken(s, '--ft-text-secondary')
  const grid = readToken(s, '--ft-chart-grid') || readToken(s, '--ft-border-subtle')
  const tooltipBg = readToken(s, '--ft-chart-tooltip-bg') || readToken(s, '--ft-surface-raised')
  const tooltipText = readToken(s, '--ft-chart-tooltip-text') || readToken(s, '--ft-text-primary')
  const tooltipSecondary = readToken(s, '--ft-chart-tooltip-secondary') || readToken(s, '--ft-text-secondary')
  const tooltipBorder = readToken(s, '--ft-chart-tooltip-border') || readToken(s, '--ft-border-default')
  const risk = readToken(s, '--ft-chart-risk') || readToken(s, '--ft-orange-500')
  const primary = readToken(s, '--ft-chart-1') || readToken(s, '--ft-primary-400')
  const accent = readToken(s, '--ft-chart-2') || readToken(s, '--ft-info-400')
  const surface = readToken(s, '--ft-surface-base')

  const palette = [
    readToken(s, '--ft-chart-1') || primary,
    readToken(s, '--ft-chart-2') || accent,
    readToken(s, '--ft-chart-3') || readToken(s, '--ft-success-400'),
    readToken(s, '--ft-chart-4') || readToken(s, '--ft-orange-400'),
    readToken(s, '--ft-chart-5') || readToken(s, '--ft-warning-400'),
  ].filter(Boolean)

  return {
    text: text || '#B1BCCF',
    grid: grid || '#232D3F',
    tooltipBg: tooltipBg || '#212A3C',
    tooltipText: tooltipText || '#E6ECF6',
    tooltipSecondary: tooltipSecondary || '#B1BCCF',
    tooltipBorder: tooltipBorder || '#313E54',
    palette: palette.length ? palette : getDefaults().palette,
    risk: risk || '#F97316',
    primary: primary || '#6B82DB',
    accent: accent || '#38BDF8',
    surface: surface || '#0C1017',
  }
}

function getDefaults(): ChartColors {
  return {
    text: '#B1BCCF',
    grid: '#232D3F',
    tooltipBg: '#212A3C',
    tooltipText: '#E6ECF6',
    tooltipSecondary: '#B1BCCF',
    tooltipBorder: '#313E54',
    palette: ['#6B82DB', '#38BDF8', '#4ADE80', '#FB923C', '#FBBF24'],
    risk: '#F97316',
    primary: '#6B82DB',
    accent: '#38BDF8',
    surface: '#0C1017',
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
