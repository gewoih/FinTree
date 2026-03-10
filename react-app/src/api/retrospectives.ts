import { apiClient } from './index';
import type {
  RetrospectiveDto,
  RetrospectiveListItemDto,
  UpsertRetrospectivePayload,
} from '@/types';

export async function getRetrospectives(): Promise<RetrospectiveListItemDto[]> {
  const res = await apiClient.get<RetrospectiveListItemDto[]>('/retrospectives');
  return res.data;
}

export async function getRetrospectiveAvailableMonths(): Promise<string[]> {
  const res = await apiClient.get<string[]>('/retrospectives/available-months');
  return res.data;
}

export async function getRetrospective(month: string): Promise<RetrospectiveDto> {
  const res = await apiClient.get<RetrospectiveDto>(`/retrospectives/${month}`);
  return res.data;
}

export async function getBannerStatus(month: string): Promise<{ showBanner: boolean }> {
  const res = await apiClient.get<{ showBanner: boolean }>(
    `/retrospectives/banner/${month}`
  );
  return res.data;
}

export async function upsertRetrospective(
  payload: UpsertRetrospectivePayload
): Promise<RetrospectiveDto> {
  const res = await apiClient.post<RetrospectiveDto>('/retrospectives', payload);
  return res.data;
}

export async function deleteRetrospective(month: string): Promise<void> {
  await apiClient.delete(`/retrospectives/${month}`);
}

export async function dismissBanner(month: string): Promise<void> {
  await apiClient.post(`/retrospectives/${month}/dismiss`);
}
