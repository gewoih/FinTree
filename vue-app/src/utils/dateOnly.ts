const UTC_DATE_ONLY_FALLBACK = 'unknown';

export function toUtcDateOnlyIso(value: Date): string {
  const localDate = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  return new Date(
    Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate())
  ).toISOString();
}

export function parseUtcDateOnlyToLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

export function formatUtcDateOnly(
  value?: string | null,
  locale = 'ru-RU',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }
): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(locale, {
    ...options,
    timeZone: 'UTC',
  });
}

export function getUtcDateOnlyKey(value?: string | null): string {
  if (!value) return UTC_DATE_ONLY_FALLBACK;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return UTC_DATE_ONLY_FALLBACK;

  const year = parsed.getUTCFullYear();
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getUtcDayRangeFromLocalDates(startDate: Date, endDate: Date): {
  startMs: number;
  endMs: number;
} {
  const startMs = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
    0,
    0,
    0,
    0
  );

  const endMs = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
    23,
    59,
    59,
    999
  );

  return { startMs, endMs };
}
