import { apiClient } from './index';
import type {
  FreedomCalculatorDefaultsDto,
  FreedomCalculatorRequestDto,
  FreedomCalculatorResultDto,
} from '@/types';

export async function getFreedomCalculatorDefaults(): Promise<FreedomCalculatorDefaultsDto> {
  const res = await apiClient.get<FreedomCalculatorDefaultsDto>(
    '/freedom-calculator/defaults'
  );
  return res.data;
}

export async function calculateFreedom(
  request: FreedomCalculatorRequestDto
): Promise<FreedomCalculatorResultDto> {
  const res = await apiClient.post<FreedomCalculatorResultDto>(
    '/freedom-calculator/calculate',
    request
  );
  return res.data;
}
