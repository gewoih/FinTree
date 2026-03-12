import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from '../common/ThemeToggle';
import { useViewport } from '../../hooks/useViewport';
import { PATHS } from '../../router/paths';
import { useUserStore } from '../../stores/userStore';
import { Button } from '../ui/button';
import { ReadOnlyBanner } from '../common/ReadOnlyBanner';
import BottomTabBar from './BottomTabBar';
import Sidebar from './Sidebar';

const SIDEBAR_COLLAPSED_KEY = 'ft-sidebar-collapsed';

export default function AppShell() {
  const { isDesktop } = useViewport();
  const navigate = useNavigate();
  const isReadOnlyMode = useUserStore(
    (state) => state.currentUser?.subscription?.isReadOnlyMode ?? false
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;

      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage errors.
      }

      return next;
    });
  };

  const handlePayClick = () => {
    void navigate({
      to: PATHS.PROFILE,
      hash: 'subscription',
    });
  };

  return (
    <div
      className="app-shell flex min-h-screen flex-col bg-background text-foreground"
      data-collapsed={isDesktop && sidebarCollapsed ? 'true' : undefined}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:border focus:bg-background focus:px-4 focus:py-2"
      >
        Перейти к основному содержимому
      </a>

      <header className="app-shell__topnav sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {isDesktop && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                sidebarCollapsed
                  ? 'Показать боковое меню'
                  : 'Скрыть боковое меню'
              }
              aria-expanded={!sidebarCollapsed}
              onClick={toggleSidebar}
              className="min-h-[44px] min-w-[44px]"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}

          <Link
            to={PATHS.ANALYTICS}
            className="flex items-center gap-2 text-lg font-semibold text-primary"
          >
            FinTree
          </Link>
        </div>

        <ThemeToggle />
      </header>

      {isReadOnlyMode && <ReadOnlyBanner onPayClick={handlePayClick} />}

      <div className="app-shell__body flex flex-1 overflow-hidden">
        {isDesktop && <Sidebar collapsed={sidebarCollapsed} />}

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
          style={{
            paddingBottom: isDesktop
              ? undefined
              : 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
          }}
        >
          <Outlet />
        </main>
      </div>

      {!isDesktop && <BottomTabBar />}
    </div>
  );
}
