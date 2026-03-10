import { Link, Outlet } from '@tanstack/react-router';
import ThemeToggle from '../common/ThemeToggle';
import { PATHS } from '../../router/paths';

export default function PublicPageLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link to={PATHS.HOME} className="text-lg font-semibold text-primary">
            FinTree
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-4 px-4 text-sm text-muted-foreground">
          <Link to={PATHS.PRIVACY} className="transition-colors hover:text-foreground">
            Политика конфиденциальности
          </Link>
          <Link to={PATHS.TERMS} className="transition-colors hover:text-foreground">
            Условия использования
          </Link>
          <Link to={PATHS.BLOG} className="transition-colors hover:text-foreground">
            Блог
          </Link>
          <Link to={PATHS.CAREERS} className="transition-colors hover:text-foreground">
            Карьера
          </Link>
        </div>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} FinTree
        </div>
      </footer>
    </div>
  );
}
