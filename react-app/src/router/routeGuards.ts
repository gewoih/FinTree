import { redirect } from '@tanstack/react-router';
import { ensureCurrentUserSession, getCurrentUserSnapshot } from '@/features/auth/session';
import { isValidReflectionMonth } from '@/features/reflections/reflectionModels';
import { PATHS } from './paths';

export async function bootstrapAppSession(): Promise<void> {
  try {
    await ensureCurrentUserSession();
  } catch {
    // Ignore bootstrap failures on first load. Route-level data can surface errors later.
  }
}

export function redirectAuthenticatedUser(): void {
  if (getCurrentUserSnapshot()) {
    throw redirect({ to: PATHS.ANALYTICS });
  }
}

export async function requireAuthenticatedUser() {
  const currentUser = await ensureCurrentUserSession();

  if (!currentUser) {
    throw redirect({ to: PATHS.LOGIN });
  }

  return currentUser;
}

export async function requireOwnerUser() {
  const currentUser = await requireAuthenticatedUser();

  if (!currentUser.isOwner) {
    throw redirect({ to: PATHS.PROFILE });
  }

  return currentUser;
}

export function validateRetroDetailMonth(month: string): void {
  if (!isValidReflectionMonth(month)) {
    throw redirect({
      to: PATHS.REFLECTIONS,
      replace: true,
    });
  }
}
