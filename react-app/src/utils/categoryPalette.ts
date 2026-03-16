const CATEGORY_PALETTE = [
  { tokenName: '--ft-chart-category-1', fallbackHex: '#488fa7' },
  { tokenName: '--ft-chart-category-2', fallbackHex: '#8faa58' },
  { tokenName: '--ft-chart-category-3', fallbackHex: '#c94139' },
  { tokenName: '--ft-chart-category-4', fallbackHex: '#2fc470' },
  { tokenName: '--ft-chart-category-5', fallbackHex: '#bc8f30' },
  { tokenName: '--ft-chart-category-6', fallbackHex: '#9b7fd4' },
  { tokenName: '--ft-chart-category-7', fallbackHex: '#68a6b9' },
  { tokenName: '--ft-chart-category-8', fallbackHex: '#c4689a' },
  { tokenName: '--ft-chart-category-9', fallbackHex: '#d0a271' },
  { tokenName: '--ft-chart-category-10', fallbackHex: '#3a748a' },
] as const;

function hashSeed(seed: string): number {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getPaletteEntry(seed?: string | null) {
  if (!seed) {
    return CATEGORY_PALETTE[0];
  }

  return CATEGORY_PALETTE[hashSeed(seed) % CATEGORY_PALETTE.length] ?? CATEGORY_PALETTE[0];
}

export function getCategoryColorToken(seed?: string | null): string {
  const entry = getPaletteEntry(seed);
  return `var(${entry.tokenName})`;
}

export function getCategoryColorValue(seed?: string | null): string {
  const entry = getPaletteEntry(seed);

  if (typeof window === 'undefined') {
    return entry.fallbackHex;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(entry.tokenName)
    .trim();

  return value || entry.fallbackHex;
}

export function getDefaultCategoryHexColor(): string {
  return CATEGORY_PALETTE[3]?.fallbackHex ?? '#2fc470';
}
