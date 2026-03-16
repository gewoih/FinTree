import { Link, useRouterState } from '@tanstack/react-router';
import { Ellipsis, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PATHS } from '../../router/paths';
import { cn } from '../../utils/cn';
import { MOBILE_MORE_ITEMS, MOBILE_PRIMARY_TABS, type NavItem } from '../../constants/navigation';

const PROFILE_ITEM: NavItem = { label: 'Профиль', icon: User, to: PATHS.PROFILE };

/** All items reachable via the "More" overflow menu */
const MORE_MENU_ITEMS: NavItem[] = [...MOBILE_MORE_ITEMS, PROFILE_ITEM];

export default function BottomTabBar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Store the path at which the "More" menu was opened.
  // When currentPath changes (navigation), openAtPath no longer matches → menu closes automatically.
  const [openAtPath, setOpenAtPath] = useState<string | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const isMoreOpen = openAtPath === currentPath;

  const isActive = (to: string) =>
    currentPath === to || currentPath.startsWith(`${to}/`);

  const isMoreActive = MORE_MENU_ITEMS.some((item) => isActive(item.to));

  const closeMoreMenu = () => setOpenAtPath(null);
  const toggleMoreMenu = () =>
    setOpenAtPath((prev) => (prev === currentPath ? null : currentPath));

  // Close the "More" menu when user clicks outside
  useEffect(() => {
    if (!isMoreOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        closeMoreMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMoreOpen]);

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-[var(--ft-z-dropdown,1000)] flex items-stretch border-t border-border bg-background"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Основная навигация"
    >
      {MOBILE_PRIMARY_TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          aria-current={isActive(tab.to) ? 'page' : undefined}
          className={cn(
            'relative flex min-h-[44px] flex-1 select-none flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors active:scale-95',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            isActive(tab.to)
              ? 'text-primary'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
        >
          {isActive(tab.to) && (
            <span
              className="absolute top-0 left-1/2 h-0.5 w-2/5 -translate-x-1/2 rounded-b bg-primary"
              aria-hidden="true"
            />
          )}

          <tab.icon className="h-5 w-5" aria-hidden="true" />
          <span className="max-w-full truncate text-[11px] tracking-tight">
            {tab.label}
          </span>
        </Link>
      ))}

      <div ref={moreRef} className="relative flex flex-1">
        <button
          type="button"
          aria-current={isMoreActive ? 'page' : undefined}
          aria-expanded={isMoreOpen}
          aria-haspopup="true"
          aria-controls="mobile-more-menu"
          onClick={toggleMoreMenu}
          className={cn(
            'relative flex min-h-[44px] w-full flex-1 cursor-pointer select-none flex-col items-center justify-center gap-0.5 border-0 bg-transparent text-xs font-medium transition-colors active:scale-95',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            isMoreActive
              ? 'text-primary'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
        >
          {isMoreActive && (
            <span
              className="absolute top-0 left-1/2 h-0.5 w-2/5 -translate-x-1/2 rounded-b bg-primary"
              aria-hidden="true"
            />
          )}

          <Ellipsis className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] tracking-tight">Ещё</span>
        </button>

        {isMoreOpen && (
          <nav
            id="mobile-more-menu"
            className="absolute right-2 bottom-[calc(100%+8px)] z-[var(--ft-z-dropdown,1000)] flex min-w-[168px] flex-col gap-1 rounded-lg border border-border bg-popover p-2 shadow-md"
            aria-label="Дополнительная навигация"
          >
            {MORE_MENU_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? 'page' : undefined}
                onClick={closeMoreMenu}
                className={cn(
                  'flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </nav>
  );
}
