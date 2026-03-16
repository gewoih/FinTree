import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { LogOut, Settings, Shield } from 'lucide-react';
import { PATHS } from '../../router/paths';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import {
  PRIMARY_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  type NavItem,
} from '../../constants/navigation';

interface SidebarProps {
  collapsed: boolean;
}

interface NavLinkProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}

function NavLink({ item, collapsed, isActive }: NavLinkProps) {
  return (
    <Link
      to={item.to}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <item.icon
        className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')}
        aria-hidden="true"
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const currentUser = useUserStore((state) => state.currentUser);
  const isOwner = currentUser?.isOwner === true;
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false;

  const displayName = currentUser?.name?.trim() || currentUser?.email || 'Аккаунт';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    await navigate({ to: PATHS.LOGIN });
  };

  const isActive = (to: string) =>
    currentPath === to || currentPath.startsWith(`${to}/`);

  const settingsItem: NavItem = { label: 'Настройки', icon: Settings, to: PATHS.PROFILE };
  const adminItem: NavItem = { label: 'Админ', icon: Shield, to: PATHS.ADMIN };

  return (
    <aside
      className="app-shell__sidebar sticky top-0 flex h-full min-h-0 flex-shrink-0 self-stretch flex-col overflow-hidden border-r border-border bg-background transition-all duration-200"
      style={{ width: collapsed ? '64px' : '280px' }}
      aria-label="Боковое меню"
    >
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
        <nav aria-label="Основная навигация" className="flex flex-col gap-0.5">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              collapsed={collapsed}
              isActive={isActive(item.to)}
            />
          ))}
        </nav>

        <div className="my-2 border-t border-border" role="separator" />

        <nav aria-label="Дополнительная навигация" className="flex flex-col gap-0.5">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              collapsed={collapsed}
              isActive={isActive(item.to)}
            />
          ))}

          <NavLink
            item={settingsItem}
            collapsed={collapsed}
            isActive={isActive(PATHS.PROFILE)}
          />

          {isOwner && (
            <NavLink
              item={adminItem}
              collapsed={collapsed}
              isActive={isActive(PATHS.ADMIN)}
            />
          )}
        </nav>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
              aria-hidden="true"
            >
              {initials}
            </div>

            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
              <span className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full',
                    isReadOnlyMode
                      ? 'bg-muted-foreground'
                      : 'bg-[var(--ft-success-500)]'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate text-muted-foreground">
                  {isReadOnlyMode ? 'Режим просмотра' : 'Подписка активна'}
                </span>
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Выйти</span>
          </Button>
        </div>
      )}

      {collapsed && (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] w-full text-muted-foreground hover:text-destructive"
            aria-label="Выйти"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </aside>
  );
}
