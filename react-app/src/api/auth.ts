import { apiClient, type AuthRequestConfig } from './index';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  TelegramLoginPayload,
} from '@/types';

const AUTH_CONFIG: AuthRequestConfig = {
  skipAuthRedirect: true,
  skipAuthRefresh: true,
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', payload, AUTH_CONFIG);
  return res.data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>(
    '/auth/register',
    payload,
    AUTH_CONFIG
  );
  return res.data;
}

export async function loginWithTelegram(
  payload: TelegramLoginPayload
): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>(
    '/auth/telegram',
    payload,
    AUTH_CONFIG
  );
  return res.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout', null, AUTH_CONFIG);
}

export async function refreshToken(): Promise<void> {
  await apiClient.post('/auth/refresh', null, AUTH_CONFIG);
}
