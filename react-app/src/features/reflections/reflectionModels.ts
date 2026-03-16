import type {
  AnalyticsDashboardDto,
  RetrospectiveListItemDto,
  StabilityActionCode,
  UpsertRetrospectivePayload,
} from '@/types';
import { formatCurrency, formatNumber } from '@/utils/format';

export type ReflectionChartRange = 6 | 12 | 0;
export type ReflectionRatingField =
  | 'disciplineRating'
  | 'impulseControlRating'
  | 'confidenceRating';

export interface ReflectionMonthOption {
  label: string;
  value: string;
  hasRetrospective: boolean;
}

export interface ReflectionTextFieldMeta {
  key: keyof Pick<
    UpsertRetrospectivePayload,
    'wins' | 'savingsOpportunities' | 'conclusion' | 'nextMonthPlan'
  >;
  label: string;
  hint: string;
  placeholder: string;
  maxLength: number;
}

export interface ReflectionRatingFieldMeta {
  key: ReflectionRatingField;
  label: string;
  hint: string;
}

export interface ReflectionChartDatum {
  label: string;
  month: string;
  disciplineRating: number;
  impulseControlRating: number;
  confidenceRating: number;
  total: number;
}

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const REFLECTION_RANGE_OPTIONS: Array<{
  label: string;
  value: ReflectionChartRange;
}> = [
  { label: '6 мес', value: 6 },
  { label: '12 мес', value: 12 },
  { label: 'Всё', value: 0 },
];

export const REFLECTION_RATING_FIELDS: ReflectionRatingFieldMeta[] = [
  {
    key: 'disciplineRating',
    label: 'Дисциплина',
    hint: 'Придерживался ли я бюджета?',
  },
  {
    key: 'impulseControlRating',
    label: 'Контроль импульсов',
    hint: 'Избегал ли я необдуманных покупок?',
  },
  {
    key: 'confidenceRating',
    label: 'Финансовая уверенность',
    hint: 'Чувствовал ли я контроль над деньгами?',
  },
];

export const REFLECTION_TEXT_FIELDS: ReflectionTextFieldMeta[] = [
  {
    key: 'wins',
    label: 'Что получилось',
    hint: 'Достижения месяца: что сработало и что стоит повторить.',
    placeholder: 'Придерживался бюджета, закрыл долг, отложил 20 тыс.',
    maxLength: 1000,
  },
  {
    key: 'savingsOpportunities',
    label: 'Что можно было сделать лучше',
    hint: 'Конкретные расходы и решения, которые хочется скорректировать.',
    placeholder: 'Кафе можно было сократить до 10 тыс.\nИмпульсивная покупка — 15 тыс.',
    maxLength: 2000,
  },
  {
    key: 'conclusion',
    label: 'Выводы',
    hint: 'Ключевые уроки месяца. Один вывод на строку читается лучше.',
    placeholder: 'Не сочетать несколько крупных покупок в один месяц.',
    maxLength: 2000,
  },
  {
    key: 'nextMonthPlan',
    label: 'План на следующий месяц',
    hint: 'Небольшие конкретные шаги и ограничения, которые реально выполнить.',
    placeholder: 'Отменить ненужные подписки и держать лимит на кафе.',
    maxLength: 2000,
  },
];

export function isValidReflectionMonth(month: string): boolean {
  return MONTH_REGEX.test(month);
}

export function parseReflectionMonth(
  month: string
): { year: number; month: number } | null {
  if (!isValidReflectionMonth(month)) {
    return null;
  }

  const [yearRaw, monthRaw] = month.split('-');
  const year = Number(yearRaw);
  const parsedMonth = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(parsedMonth)) {
    return null;
  }

  return { year, month: parsedMonth };
}

export function formatReflectionMonth(month: string): string {
  const parsed = parseReflectionMonth(month);

  if (!parsed) {
    return month;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(parsed.year, parsed.month - 1, 1));
}

export function formatReflectionMonthCompact(month: string): string {
  const parsed = parseReflectionMonth(month);

  if (!parsed) {
    return month;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
    year: '2-digit',
  })
    .format(new Date(parsed.year, parsed.month - 1, 1))
    .replace(/\s*г\.$/i, '')
    .trim();
}

export function sortReflectionsAscending(
  items: RetrospectiveListItemDto[]
): RetrospectiveListItemDto[] {
  return [...items].sort((left, right) => left.month.localeCompare(right.month));
}

export function sortReflectionsDescending(
  items: RetrospectiveListItemDto[]
): RetrospectiveListItemDto[] {
  return [...items].sort((left, right) => right.month.localeCompare(left.month));
}

export function getReflectionPreview(
  item: Pick<RetrospectiveListItemDto, 'winsPreview' | 'conclusionPreview'>
): string | null {
  return item.winsPreview ?? item.conclusionPreview ?? null;
}

export function getReflectionScores(
  item: Pick<
    RetrospectiveListItemDto,
    'disciplineRating' | 'impulseControlRating' | 'confidenceRating'
  >
): number[] {
  return [
    item.disciplineRating,
    item.impulseControlRating,
    item.confidenceRating,
  ].filter((value): value is number => value != null);
}

export function getReflectionScorePercent(
  item: Pick<
    RetrospectiveListItemDto,
    'disciplineRating' | 'impulseControlRating' | 'confidenceRating'
  >
): number | null {
  const scores = getReflectionScores(item);

  if (scores.length === 0) {
    return null;
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  return Math.round((total / (scores.length * 5)) * 100);
}

export function formatReflectionScore(value: number | null): string {
  return value == null ? '—' : `${value}%`;
}

export function formatReflectionRating(value: number | null): string {
  return value == null ? '—' : String(value);
}

export function buildReflectionChartData(
  items: RetrospectiveListItemDto[],
  range: ReflectionChartRange
): ReflectionChartDatum[] {
  const sorted = sortReflectionsAscending(items);
  const visibleItems = range === 0 ? sorted : sorted.slice(-range);

  return visibleItems.map((item) => ({
    label: formatReflectionMonthCompact(item.month),
    month: item.month,
    disciplineRating: item.disciplineRating ?? 0,
    impulseControlRating: item.impulseControlRating ?? 0,
    confidenceRating: item.confidenceRating ?? 0,
    total: getReflectionScores(item).reduce((sum, score) => sum + score, 0),
  }));
}

function normalizeRetrospectiveText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeRetrospectivePayload(
  payload: UpsertRetrospectivePayload
): UpsertRetrospectivePayload {
  return {
    month: payload.month,
    conclusion: normalizeRetrospectiveText(payload.conclusion),
    nextMonthPlan: normalizeRetrospectiveText(payload.nextMonthPlan),
    wins: normalizeRetrospectiveText(payload.wins),
    savingsOpportunities: normalizeRetrospectiveText(payload.savingsOpportunities),
    disciplineRating: payload.disciplineRating ?? null,
    impulseControlRating: payload.impulseControlRating ?? null,
    confidenceRating: payload.confidenceRating ?? null,
  };
}

export function hasMeaningfulRetrospectivePayload(
  payload: UpsertRetrospectivePayload
): boolean {
  const normalized = normalizeRetrospectivePayload(payload);

  return Boolean(
    normalized.disciplineRating != null ||
      normalized.impulseControlRating != null ||
      normalized.confidenceRating != null ||
      normalized.conclusion ||
      normalized.nextMonthPlan ||
      normalized.wins ||
      normalized.savingsOpportunities
  );
}

export function getReflectionScoreTone(
  value: number | null
): 'good' | 'average' | 'poor' | null {
  if (value == null) {
    return null;
  }

  if (value >= 70) {
    return 'good';
  }

  if (value >= 40) {
    return 'average';
  }

  return 'poor';
}

export function getSummaryScoreStatus(value: number | null): string | null {
  if (value == null) {
    return null;
  }

  if (value >= 80) {
    return 'Отличный месяц';
  }

  if (value >= 60) {
    return 'Хороший месяц';
  }

  if (value >= 40) {
    return 'Средний результат';
  }

  if (value >= 20) {
    return 'Требует внимания';
  }

  return 'Критично';
}

export function getSummaryDeltaLabel(
  value: number | null | undefined
): string | null {
  if (value == null) {
    return null;
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, 1)}% к пред. месяцу`;
}

export function isSummaryDeltaPositive(
  value: number | null | undefined
): boolean {
  return (value ?? 0) < 0;
}

export function getStabilityActionLabel(
  code: StabilityActionCode | null
): string | null {
  if (code === 'keep_routine') {
    return 'Поддерживайте ритм';
  }

  if (code === 'smooth_spikes') {
    return 'Сгладьте всплески';
  }

  if (code === 'cap_impulse_spend') {
    return 'Контролируйте импульсы';
  }

  return null;
}

export function formatPeakSummary(
  summary: AnalyticsDashboardDto,
  currencyCode: string
): string | null {
  if (!summary.peaks.count || summary.peaks.total == null) {
    return null;
  }

  const share = summary.peaks.sharePercent != null
    ? ` • ${formatNumber(summary.peaks.sharePercent, 1)}%`
    : '';

  return `${summary.peaks.count} дн. • ${formatCurrency(summary.peaks.total, currencyCode)}${share}`;
}
