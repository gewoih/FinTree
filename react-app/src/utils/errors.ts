import axios from 'axios';

/**
 * Extracts a user-facing error message from an unknown error value.
 *
 * Priority:
 *   1. `userMessage` — set by the API interceptor on AxiosErrors
 *   2. Backend body: `response.data.error` or `response.data.message`
 *   3. Native Error `.message`
 *   4. `fallback`
 */
export function resolveApiErrorMessage(error: unknown, fallback: string): string {
  if (!error) {
    return fallback;
  }

  // Axios errors augmented by the API interceptor carry a ready `userMessage`.
  if (axios.isAxiosError(error)) {
    const userMsg = (error as { userMessage?: string }).userMessage;
    if (typeof userMsg === 'string' && userMsg.trim()) {
      return userMsg;
    }

    const data = error.response?.data as { error?: string; message?: string } | undefined;
    const backendMsg = data?.error ?? data?.message;
    if (typeof backendMsg === 'string' && backendMsg.trim()) {
      return backendMsg;
    }

    return fallback;
  }

  // Native JS Error
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
