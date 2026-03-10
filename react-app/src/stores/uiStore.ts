import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface UiState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyTheme(next);
      },
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: 'ft-theme', partialize: (s) => ({ theme: s.theme }) }
  )
);

function applyTheme(theme: Theme) {
  const html = document.documentElement;

  if (theme === 'light') {
    html.classList.add('light-mode');
  } else {
    html.classList.remove('light-mode');
  }
}

const savedTheme = (
  JSON.parse(localStorage.getItem('ft-theme') ?? '{}') as {
    state?: { theme?: Theme };
  }
).state?.theme ?? 'dark';

applyTheme(savedTheme);
