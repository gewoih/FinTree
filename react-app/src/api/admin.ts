import { apiClient } from './index';
import type { AdminOverviewDto } from '@/types';

export async function getAdminOverview(): Promise<AdminOverviewDto> {
  const res = await apiClient.get<AdminOverviewDto>('/admin/overview');
  return res.data;
}
