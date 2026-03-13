const CATEGORY_TOKEN_NAMES = [
  '--ft-chart-category-1',
  '--ft-chart-category-2',
  '--ft-chart-category-3',
  '--ft-chart-category-4',
  '--ft-chart-category-5',
  '--ft-chart-category-6',
  '--ft-chart-category-7',
  '--ft-chart-category-8',
  '--ft-chart-category-9',
  '--ft-chart-category-10',
] as const;

function readTokenValue(tokenName: string): string {
  if (typeof window === 'undefined') {
    return `var(${tokenName})`;
  }

  return getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
}

function hashCategoryId(categoryId: string): number {
  let hash = 0;

  for (let index = 0; index < categoryId.length; index += 1) {
    hash = (hash * 31 + categoryId.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function getAnalyticsCategoryPalette(): string[] {
  return CATEGORY_TOKEN_NAMES.map((tokenName) => readTokenValue(tokenName)).filter(Boolean);
}

export function getAnalyticsCategoryColorByIndex(index: number): string {
  const palette = getAnalyticsCategoryPalette();

  if (palette.length === 0) {
    return 'var(--ft-chart-1)';
  }

  return palette[index % palette.length] ?? palette[0];
}

export function getAnalyticsOtherCategoryColor(): string {
  const color = readTokenValue('--ft-gray-500');
  return color || 'var(--ft-gray-500)';
}

export function getAnalyticsCategoryColor(categoryId: string): string {
  const palette = getAnalyticsCategoryPalette();

  if (palette.length === 0) {
    return 'var(--ft-chart-1)';
  }

  return palette[hashCategoryId(categoryId) % palette.length] ?? palette[0];
}
