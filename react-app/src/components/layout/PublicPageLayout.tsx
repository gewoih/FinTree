import { Link, Outlet } from '@tanstack/react-router';
import { Button } from '../ui/button';
import ThemeToggle from '../common/ThemeToggle';
import { PATHS } from '../../router/paths';

export default function PublicPageLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to={PATHS.HOME} className="text-lg font-semibold tracking-tight text-primary">
            FinTree
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to={PATHS.LOGIN}>Войти</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link to={PATHS.REGISTER}>Попробовать</Link>
            </Button>
            <Button asChild size="sm" className="sm:hidden">
              <Link to={PATHS.REGISTER}>Попробовать</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/70 bg-background/70 py-8 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 text-center sm:px-6">
          <p className="text-sm font-medium text-foreground">
            FinTree
          </p>
          <p className="text-sm text-muted-foreground">
            Финансовый помощник для тех, кто хочет тратить осознанно.
          </p>
        </div>
        <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
          <a href="#" className="transition-colors hover:text-foreground">Политика конфиденциальности</a>
          <a href="#" className="transition-colors hover:text-foreground">Пользовательское соглашение</a>
        </div>
        <div className="mt-3 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FinTree
        </div>
      </footer>
    </div>
  );
}
