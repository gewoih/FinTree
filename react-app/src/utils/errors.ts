export function resolveApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") {
    return fallback
  }

  const normalized = error as {
    response?: { data?: { error?: string; message?: string } }
    userMessage?: string
  }

  const backendMessage =
    normalized.response?.data?.error ?? normalized.response?.data?.message

  if (typeof backendMessage === "string" && backendMessage.trim()) {
    return backendMessage
  }

  if (typeof normalized.userMessage === "string" && normalized.userMessage.trim()) {
    return normalized.userMessage
  }

  return fallback
}
