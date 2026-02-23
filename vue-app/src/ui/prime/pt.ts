type ClassValue = string | string[] | null | undefined;
type PtSection = {
  class?: ClassValue;
  [key: string]: unknown;
};

type PtInput = object | undefined;

const normalizeClass = (value: ClassValue): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap(item => normalizeClass(item));
  }

  return value
    .split(' ')
    .map(item => item.trim())
    .filter(Boolean);
};

export const mergeClassNames = (...values: ClassValue[]): string | undefined => {
  const classes = values.flatMap(normalizeClass);
  if (!classes.length) return undefined;

  return Array.from(new Set(classes)).join(' ');
};

const isPlainObject = (value: unknown): value is PtSection =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const mergeSection = (base: PtSection, incoming: PtSection): PtSection => {
  const result: PtSection = { ...base, ...incoming };

  // Merge class at this level
  if (base.class !== undefined || incoming.class !== undefined) {
    result.class = mergeClassNames(base.class, incoming.class);
  }

  // Recursively merge nested plain-object keys (e.g. pc* sub-component sections)
  for (const key of Object.keys(incoming)) {
    if (key === 'class') continue;
    const b = (base as Record<string, unknown>)[key];
    const i = (incoming as Record<string, unknown>)[key];
    if (isPlainObject(b) && isPlainObject(i)) {
      (result as Record<string, unknown>)[key] = mergeSection(b, i);
    }
  }

  return result;
};

export const mergePt = <T extends object>(base: T, incoming?: PtInput): T => {
  if (!incoming) return base;

  const result = { ...(base as Record<string, unknown>) } as Record<string, unknown>;

  for (const [key, incomingSection] of Object.entries(
    incoming as Record<string, PtSection | undefined>
  )) {
    if (!incomingSection) continue;

    const baseSection = result[key] as PtSection | undefined;

    if (!baseSection) {
      result[key] = incomingSection;
      continue;
    }

    result[key] = mergeSection(baseSection, incomingSection);
  }

  return result as T;
};
