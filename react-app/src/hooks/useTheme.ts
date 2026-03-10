import { useUiStore } from '@/stores/uiStore';

export function useTheme() {
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}
