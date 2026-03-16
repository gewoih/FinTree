import type { FreedomCalculatorRequestDto } from '@/types';

export type FreedomFormState = FreedomCalculatorRequestDto;

export interface FreedomDayCell {
  day: number;
  type: 'free' | 'work';
}

export interface FreedomCalendarMonth {
  name: string;
  cells: FreedomDayCell[];
}
