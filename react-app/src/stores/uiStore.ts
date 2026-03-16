import { create } from 'zustand';

const STORAGE_KEY = 'ft-theme';

function applyThemeToDOM(theme: 'dark' | 'light') {
  if (theme === 'light') {
    document.documentElement.classList.add('light-mode');
  } else {
    document.documentElement.classList.remove('light-mode');
  }
}

function readThemeFromStorage(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Ignore storage errors (private mode / disabled storage).
  }

  return 'dark';
}

interface UiState {
  theme: 'dark' | 'light';
}

interface UiActions {
  toggleTheme(): void;
  setTheme(theme: 'dark' | 'light'): void;
  initTheme(): void;
}

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  theme: 'dark',

  initTheme() {
    const theme = readThemeFromStorage();
    set({ theme });
    applyThemeToDOM(theme);
  },

  toggleTheme() {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setTheme(theme) {
    set({ theme });

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors (private mode / disabled storage).
    }

    applyThemeToDOM(theme);
  },
}));
