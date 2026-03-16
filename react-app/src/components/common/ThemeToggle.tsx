import { Moon, Sun } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { Button } from '../ui/button';

export default function ThemeToggle() {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="min-h-[44px] min-w-[44px]"
      aria-label={
        theme === 'dark'
          ? 'Переключить на светлую тему'
          : 'Переключить на тёмную тему'
      }
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  );
}
