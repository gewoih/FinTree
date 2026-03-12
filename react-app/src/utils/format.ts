/**
 * Утилиты форматирования для FinTree
 * Locale: ru-RU
 */

import type { AccountType } from '@/types';

const RU_NUMBER = new Intl.NumberFormat('ru-RU');
const RU_CURRENCY_BASE = (currency: string) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const ACCOUNT_TYPE_MAP: Record<string, AccountType> = {
  Bank: 0,
  Cash: 0,
  Crypto: 2,
  Brokerage: 3,
  Deposit: 4,
};

/** Нормализует тип счёта из бэкенда в числовой union. */
export function normalizeAccountType(
  raw: AccountType | string | number
): AccountType {
  if (typeof raw === 'number') {
    if (raw === 0 || raw === 2 || raw === 3 || raw === 4) {
      return raw;
    }

    return 0;
  }

  return ACCOUNT_TYPE_MAP[raw] ?? 0;
}

/** Форматирует сумму с символом валюты. Пример: "1 234,56 ₽" */
export function formatCurrency(amount: number, currencyCode = 'RUB'): string {
  try {
    return RU_CURRENCY_BASE(currencyCode).format(amount);
  } catch {
    return `${RU_NUMBER.format(amount)} ${currencyCode}`;
  }
}

/** Форматирует число без валюты. Пример: "1 234,56" */
export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Форматирует процент. Пример: "12,5%" */
export function formatPercent(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}

/** Форматирует ISO-дату в читаемый формат. Пример: "15 янв 2025" */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate));
}

/** Форматирует ISO-дату коротко. Пример: "15.01.2025" */
export function formatDateShort(isoDate: string): string {
  return new Intl.DateTimeFormat('ru-RU').format(new Date(isoDate));
}

/** Форматирует ISO-дату вместе со временем. Пример: "15.01.2025, 14:35" */
export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

/** Форматирует дату с полным названием месяца. Пример: "15 января 2025" */
export function formatDateLong(isoDate: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate));
}

/** Форматирует год и месяц. Пример: "Январь 2025" */
export function formatYearMonth(year: number, month: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1));
}

/** Возвращает текущий год и месяц */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Форматирует количество месяцев в читаемый текст. Пример: "2 года 3 месяца" */
export function formatMonthsToYearsAndMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${pluralizeYears(years)}`);
  if (months > 0) parts.push(`${months} ${pluralizeMonths(months)}`);
  return parts.join(' ') || '0 месяцев';
}

function pluralizeYears(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return 'лет';
  if (n % 10 === 1) return 'год';
  if (n % 10 >= 2 && n % 10 <= 4) return 'года';
  return 'лет';
}

function pluralizeMonths(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return 'месяцев';
  if (n % 10 === 1) return 'месяц';
  if (n % 10 >= 2 && n % 10 <= 4) return 'месяца';
  return 'месяцев';
}
