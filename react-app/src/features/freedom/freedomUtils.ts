import type { FreedomCalculatorRequestDto } from '@/types';
import type { FreedomCalendarMonth } from './freedomModels';

const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

export function normalizeFreedomRequest(
  params: FreedomCalculatorRequestDto
): FreedomCalculatorRequestDto {
  return {
    capital: Math.max(0, roundCurrency(params.capital)),
    monthlyExpenses: Math.max(0, roundCurrency(params.monthlyExpenses)),
    swrPercent: roundPercent(params.swrPercent),
    inflationRatePercent: roundPercent(params.inflationRatePercent),
    inflationEnabled: params.inflationEnabled,
  };
}

export function getFreedomRequestKey(params: FreedomCalculatorRequestDto): string {
  return JSON.stringify(normalizeFreedomRequest(params));
}

export function pluralizeDays(value: number): string {
  const lastTwo = value % 100;
  const lastOne = value % 10;

  if (lastTwo >= 11 && lastTwo <= 19) {
    return 'дней';
  }

  if (lastOne === 1) {
    return 'день';
  }

  if (lastOne >= 2 && lastOne <= 4) {
    return 'дня';
  }

  return 'дней';
}

export function buildFreedomCalendarMonths(
  freeDaysPerYear: number
): FreedomCalendarMonth[] {
  let remainingFreeDays = Math.min(365, Math.max(0, Math.floor(freeDaysPerYear)));
  const year = new Date().getFullYear();

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    return {
      name: MONTH_NAMES[monthIndex],
      cells: Array.from({ length: daysInMonth }, (_, dayIndex) => {
        const isFree = remainingFreeDays > 0;

        if (isFree) {
          remainingFreeDays -= 1;
        }

        return {
          day: dayIndex + 1,
          type: isFree ? 'free' : 'work',
        };
      }),
    };
  });
}
