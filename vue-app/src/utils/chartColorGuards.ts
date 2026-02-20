const HEX_COLOR_PATTERN = /^#(?:[0-9A-F]{3}|[0-9A-F]{6})$/i;
const CATEGORY_COLOR_FALLBACK = ['#7DA6E8', '#66C2D9', '#5BD490', '#FFB454', '#C1A3FF'];
const DEFAULT_CATEGORY_COLOR = '#7DA6E8';
const MIN_CATEGORY_SATURATION = 0.18;
const MIN_CATEGORY_SURFACE_CONTRAST = 1.55;
const MIN_CATEGORY_DISTANCE = 48;

function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const candidate = value.trim();
  if (!HEX_COLOR_PATTERN.test(candidate)) return null;
  if (candidate.length === 4) {
    const [hash, r, g, b] = candidate;
    return `${hash}${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return candidate.toUpperCase();
}

function hexToRgbTuple(value: string): [number, number, number] | null {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  const hex = normalized.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const red = toLinear(r);
  const green = toLinear(g);
  const blue = toLinear(b);
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(first: [number, number, number], second: [number, number, number]): number {
  const firstLum = relativeLuminance(first);
  const secondLum = relativeLuminance(second);
  const lighter = Math.max(firstLum, secondLum);
  const darker = Math.min(firstLum, secondLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbSaturation([r, g, b]: [number, number, number]): number {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  if (max === min) return 0;
  const lightness = (max + min) / 2;
  return (max - min) / (1 - Math.abs((2 * lightness) - 1));
}

function colorDistance(first: [number, number, number], second: [number, number, number]): number {
  const [r1, g1, b1] = first;
  const [r2, g2, b2] = second;
  return Math.sqrt(((r1 - r2) ** 2) + ((g1 - g2) ** 2) + ((b1 - b2) ** 2));
}

function isDistinctFromUsed(color: string, usedColors: string[]): boolean {
  const current = hexToRgbTuple(color);
  if (!current) return false;
  return usedColors.every((used) => {
    const usedRgb = hexToRgbTuple(used);
    return !usedRgb || colorDistance(current, usedRgb) >= MIN_CATEGORY_DISTANCE;
  });
}

function isCategoryColorUsable(color: string, surfaceColor: string | null, usedColors: string[]): boolean {
  const rgb = hexToRgbTuple(color);
  if (!rgb) return false;
  if (rgbSaturation(rgb) < MIN_CATEGORY_SATURATION) return false;
  if (!isDistinctFromUsed(color, usedColors)) return false;

  if (surfaceColor) {
    const surfaceRgb = hexToRgbTuple(surfaceColor);
    if (surfaceRgb && contrastRatio(rgb, surfaceRgb) < MIN_CATEGORY_SURFACE_CONTRAST) {
      return false;
    }
  }

  return true;
}

function resolvePaletteColor(index: number, usedColors: string[], palette: string[]): string {
  const normalizedPalette = palette
    .map((color) => normalizeHexColor(color))
    .filter((color): color is string => Boolean(color));

  const source = normalizedPalette.length ? normalizedPalette : CATEGORY_COLOR_FALLBACK;

  for (let offset = 0; offset < source.length; offset += 1) {
    const color = source[(index + offset) % source.length] ?? DEFAULT_CATEGORY_COLOR;
    if (isDistinctFromUsed(color, usedColors)) {
      return color;
    }
  }

  return source[index % source.length] ?? DEFAULT_CATEGORY_COLOR;
}

interface CategoryColorOptions {
  sourceColor: string | null | undefined;
  index: number;
  usedColors: string[];
  palette: string[];
  surfaceColor: string | null | undefined;
}

export function resolveCategoryColor(options: CategoryColorOptions): string {
  const {
    sourceColor,
    index,
    usedColors,
    palette,
    surfaceColor,
  } = options;

  const fallbackColor = resolvePaletteColor(index, usedColors, palette);
  const normalizedSurface = normalizeHexColor(surfaceColor);
  const normalizedSource = normalizeHexColor(sourceColor);

  if (normalizedSource && isCategoryColorUsable(normalizedSource, normalizedSurface, usedColors)) {
    return normalizedSource;
  }

  return fallbackColor;
}
