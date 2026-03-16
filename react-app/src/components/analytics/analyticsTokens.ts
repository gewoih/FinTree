import type { CSSProperties } from 'react';

export const analyticsPanelClassName =
  'gap-0 rounded-xl border border-[var(--ft-border-default)] bg-[var(--ft-analytics-surface)] shadow-[var(--ft-shadow-sm)]';

export const analyticsInsetClassName =
  'rounded-lg border border-[var(--ft-border-subtle)] bg-[var(--ft-analytics-surface-subtle)]';

export const analyticsTitleStyle: CSSProperties = {
  fontSize: 'var(--ft-text-2xl)',
  fontWeight: 'var(--ft-font-semibold)',
  lineHeight: 'var(--ft-leading-tight)',
};

export const analyticsHeroStyle: CSSProperties = {
  fontSize: 'var(--ft-text-hero)',
  fontWeight: 'var(--ft-font-bold)',
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
};

export const analyticsMetricStyle: CSSProperties = {
  fontSize: 'var(--ft-text-metric)',
  fontWeight: 'var(--ft-font-bold)',
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
};
