import { Link, useRouterState } from '@tanstack/react-router';
import {
  BarChart2,
  BookOpen,
  Briefcase,
  Ellipsis,
  List,
  Sun,
  Target,
  User,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PATHS } from '../../router/paths';
import { cn } from '../../utils/cn';

interface TabItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}

const primaryTabs: TabItem[] = [
  { label: 'Главная', icon: BarChart2, to: PATHS.ANALYTICS },
  { label: 'Счета', icon: Wallet, to: PATHS.ACCOUNTS },
  { label: 'Транзакции', icon: List, to: PATHS.TRANSACTIONS },
  { label: 'Инвестиции', icon: Briefcase, to: PATHS.INVESTMENTS },
];

const moreMenuItems: TabItem[] = [
  { label: 'Цели', icon: Target, to: PATHS.GOALS },
  { label: 'Свобода', icon: Sun, to: PATHS.FREEDOM },
  { label: 'Рефлексии', icon: BookOpen, to: PATHS.REFLECTIONS },
  { label: 'Профиль', icon: User, to: PATHS.PROFILE },
];

export default function BottomTabBar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isActive = (to: string) =>
    currentPath === to || currentPath.startsWith(`${to}/`);

  const isMoreActive = moreMenuItems.some((item) => isActive(item.to));

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMoreOpen]);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [currentPath]);

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-[1000] flex items-stretch border-t border-border bg-background"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Основная навигация"
    >
      {primaryTabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          aria-current={isActive(tab.to) ? 'page' : undefined}
          className={cn(
            'relative flex min-h-[44px] flex-1 select-none flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors active:scale-95',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
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
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className={cn(
            'relative flex min-h-[44px] w-full flex-1 cursor-pointer select-none flex-col items-center justify-center gap-0.5 border-0 bg-transparent text-xs font-medium transition-colors active:scale-95',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
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
            className="absolute right-2 bottom-[calc(100%+8px)] z-50 flex min-w-[168px] flex-col gap-1 rounded-lg border border-border bg-popover p-2 shadow-md"
            aria-label="Дополнительная навигация"
          >
            {moreMenuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? 'page' : undefined}
                onClick={() => setIsMoreOpen(false)}
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
