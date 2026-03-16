import { apiClient, type AuthRequestConfig } from './index';
import type {
  Currency,
  CurrentUserDto,
  SubscriptionPaymentDto,
  SubscriptionPlan,
  UpdateUserProfilePayload,
} from '@/types';

export async function getCurrentUser(): Promise<CurrentUserDto> {
  const res = await apiClient.get<CurrentUserDto>('/users/me', {
    skipAuthRedirect: true,
  } as AuthRequestConfig);
  return res.data;
}

export async function skipOnboarding(): Promise<CurrentUserDto> {
  const res = await apiClient.post<CurrentUserDto>('/users/me/skip-onboarding');
  return res.data;
}

export async function updateUserProfile(
  payload: UpdateUserProfilePayload
): Promise<CurrentUserDto> {
  const res = await apiClient.patch<CurrentUserDto>('/users/me', payload);
  return res.data;
}

export async function simulateSubscriptionPayment(
  plan: SubscriptionPlan
): Promise<CurrentUserDto> {
  const res = await apiClient.post<CurrentUserDto>('/users/subscription/pay', { plan });
  return res.data;
}

export async function getSubscriptionPayments(): Promise<SubscriptionPaymentDto[]> {
  const res = await apiClient.get<SubscriptionPaymentDto[]>('/users/subscription/payments');
  return res.data;
}

export async function getCurrencies(): Promise<Currency[]> {
  const res = await apiClient.get<Currency[]>('/currencies');
  return res.data;
}
