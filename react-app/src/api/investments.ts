import { apiClient } from './index';
import type { InvestmentsOverviewDto } from '@/types';

export async function getInvestmentsOverview(
  from?: string,
  to?: string
): Promise<InvestmentsOverviewDto> {
  const res = await apiClient.get<InvestmentsOverviewDto>('/accounts/investments', {
    params: {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  });
  return res.data;
}
