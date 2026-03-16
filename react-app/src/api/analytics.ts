import { apiClient } from './index';
import type {
  AnalyticsDashboardDto,
  EvolutionMonthDto,
  NetWorthSnapshotDto,
} from '@/types';

export async function getAnalyticsDashboard(
  year: number,
  month: number
): Promise<AnalyticsDashboardDto> {
  const res = await apiClient.get<AnalyticsDashboardDto>('/analytics/dashboard', {
    params: { year, month },
  });
  return res.data;
}

export async function getNetWorthTrend(months?: number): Promise<NetWorthSnapshotDto[]> {
  const res = await apiClient.get<NetWorthSnapshotDto[]>('/analytics/net-worth', {
    params: months ? { months } : {},
  });
  return res.data;
}

export async function getEvolution(months: number): Promise<EvolutionMonthDto[]> {
  const res = await apiClient.get<EvolutionMonthDto[]>('/analytics/evolution', {
    params: { months },
  });
  return res.data;
}
