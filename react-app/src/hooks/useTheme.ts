import { useShallow } from 'zustand/shallow';
import { useUiStore } from '@/stores/uiStore';

export function useTheme() {
  return useUiStore(
    useShallow((state) => ({
      theme: state.theme,
      setTheme: state.setTheme,
      toggleTheme: state.toggleTheme,
    }))
  );
}
