import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export const AUTH_EXPIRED_EVENT = 'ft:auth-expired';

export type AuthRequestConfig = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
  skipAuthRedirect?: boolean;
  _retry?: boolean;
};

/** Enhanced error with user-friendly message */
export interface ApiError extends AxiosError {
  userMessage: string;
}

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

let refreshRequest: Promise<void> | null = null;

function notifyAuthExpired() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function refreshSession(): Promise<void> {
  if (!refreshRequest) {
    refreshRequest = apiClient
      .post('/auth/refresh', null, {
        skipAuthRefresh: true,
        skipAuthRedirect: true,
      } as AuthRequestConfig)
      .then(() => undefined)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

function getUserFriendlyErrorMessage(error: AxiosError): string {
  if (!error.response) {
    return 'Не удалось подключиться к серверу. Проверьте интернет-соединение.';
  }

  const code = (error.response.data as { code?: string } | undefined)?.code;

  switch (error.response.status) {
    case 400:
      return 'Некорректные данные. Проверьте введённую информацию.';
    case 401:
      return 'Требуется авторизация.';
    case 403:
      if (code === 'subscription_required') {
        return 'Подписка неактивна. Для изменения данных нажмите «Оплатить».';
      }
      return 'Доступ запрещён.';
    case 404:
      return 'Ресурс не найден.';
    case 409:
      return 'Операция не может быть выполнена в текущем состоянии.';
    case 500:
      return 'Ошибка сервера. Попробуйте позже.';
    case 503:
      return 'Сервис временно недоступен.';
    default:
      return 'Произошла ошибка при выполнении запроса.';
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = (error.config ?? {}) as AuthRequestConfig;
    const url = typeof config.url === 'string' ? config.url : '';
    const isRefreshEndpoint = url.includes('/auth/refresh');

    if (error.response?.status === 401) {
      const shouldRefresh =
        !config.skipAuthRefresh && !config._retry && !isRefreshEndpoint;

      if (shouldRefresh) {
        config._retry = true;

        try {
          await refreshSession();
          return apiClient(config);
        } catch {
          // refresh failed — fall through to redirect
        }
      }

      if (!config.skipAuthRedirect && window.location.pathname !== '/login') {
        notifyAuthExpired();
      }
    }

    const enhanced: ApiError = Object.assign(error, {
      userMessage: getUserFriendlyErrorMessage(error),
    });

    return Promise.reject(enhanced);
  }
);

export { apiClient };
