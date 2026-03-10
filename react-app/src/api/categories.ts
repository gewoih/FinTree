import { apiClient } from './index';
import type {
  CreateCategoryPayload,
  TransactionCategoryDto,
  UpdateCategoryPayload,
} from '@/types';

export async function getCategories(): Promise<TransactionCategoryDto[]> {
  const res = await apiClient.get<TransactionCategoryDto[]>('/users/categories');
  return res.data;
}

export async function createCategory(payload: CreateCategoryPayload): Promise<string> {
  const res = await apiClient.post<string>('/TransactionCategory', payload);
  return res.data;
}

export async function updateCategory(payload: UpdateCategoryPayload): Promise<void> {
  await apiClient.patch('/TransactionCategory', payload);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete('/TransactionCategory', { params: { id } });
}
