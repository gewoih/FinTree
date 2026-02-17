const CATEGORIES_VISITED_STORAGE_PREFIX = 'ft:onboarding:categories-visited:';

function resolveCategoriesVisitedKey(userId: string): string {
  return `${CATEGORIES_VISITED_STORAGE_PREFIX}${userId}`;
}

export function isCategoriesOnboardingVisited(userId: string | null | undefined): boolean {
  if (!userId || typeof localStorage === 'undefined') return false;

  try {
    return localStorage.getItem(resolveCategoriesVisitedKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markCategoriesOnboardingVisited(userId: string | null | undefined): void {
  if (!userId || typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(resolveCategoriesVisitedKey(userId), '1');
  } catch {
    // ignore storage write errors (e.g. private mode restrictions)
  }
}
