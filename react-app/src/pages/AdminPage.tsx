import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  Inbox,
  RefreshCw,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';
import * as adminApi from '@/api/admin';
import { queryKeys } from '@/api/queryKeys';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { KPICard } from '@/components/common/KPICard';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  AdminKpisDto,
  AdminOverviewDto,
  AdminUserSnapshotDto,
} from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';
import { formatDateTime, formatNumber } from '@/utils/format';

const EMPTY_KPIS: AdminKpisDto = {
  totalUsers: 0,
  activeSubscriptions: 0,
  activeSubscriptionsRatePercent: 0,
  onboardingCompletedUsers: 0,
  onboardingCompletionRatePercent: 0,
  totalAccounts: 0,
  totalTransactions: 0,
  transactionsLast30Days: 0,
};

function resolveUserLabel(name: string, email: string | null): string {
  if (name.trim().length > 0) {
    return name;
  }

  if (email?.trim()) {
    return email;
  }

  return 'Без имени';
}

function formatDateTimeSafe(value: string | null): string {
  if (!value) {
    return '—';
  }

  try {
    return formatDateTime(value);
  } catch {
    return '—';
  }
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'default' | 'success' | 'warning' | 'info';
}) {
  const toneClassName =
    tone === 'success'
      ? 'border-[var(--ft-success-500)]/30 bg-[color-mix(in_srgb,var(--ft-success-500)_10%,transparent)] text-[var(--ft-success-400)]'
      : tone === 'warning'
        ? 'border-[var(--ft-warning-500)]/30 bg-[color-mix(in_srgb,var(--ft-warning-500)_10%,transparent)] text-[var(--ft-warning-300)]'
        : tone === 'info'
          ? 'border-primary/25 bg-primary/10 text-primary'
          : 'border-border bg-background/40 text-muted-foreground';

  return (
    <Badge variant="outline" className={toneClassName}>
      {label}
    </Badge>
  );
}

function AdminUsersTable({ users }: { users: AdminUserSnapshotDto[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/80 shadow-[var(--ft-shadow-sm)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Имя</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Подписка</TableHead>
            <TableHead>Онбординг</TableHead>
            <TableHead>Telegram</TableHead>
            <TableHead className="text-right">Транзакции</TableHead>
            <TableHead>Последняя активность</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.userId}>
              <TableCell className="font-medium text-foreground">
                {user.email ?? '—'}
              </TableCell>
              <TableCell>{resolveUserLabel(user.name, user.email)}</TableCell>
              <TableCell>
                <StatusBadge
                  label={user.isOwner ? 'Owner' : 'User'}
                  tone={user.isOwner ? 'info' : 'default'}
                />
              </TableCell>
              <TableCell>
                <StatusBadge
                  label={user.hasActiveSubscription ? 'Активна' : 'Неактивна'}
                  tone={user.hasActiveSubscription ? 'success' : 'warning'}
                />
              </TableCell>
              <TableCell>
                <StatusBadge
                  label={user.isOnboardingCompleted ? 'Пройден' : 'Не пройден'}
                  tone={user.isOnboardingCompleted ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell>
                {user.isTelegramLinked ? 'Привязан' : 'Не привязан'}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(user.transactionsCount, 0)}
              </TableCell>
              <TableCell>{formatDateTimeSafe(user.lastTransactionAtUtc)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function hasOverviewData(overview: AdminOverviewDto | undefined): boolean {
  if (!overview) {
    return false;
  }

  return (
    overview.users.length > 0 ||
    Object.values(overview.kpis).some((value) => value > 0)
  );
}

export default function AdminPage() {
  const overviewQuery = useQuery({
    queryKey: queryKeys.admin.overview(),
    queryFn: adminApi.getAdminOverview,
    staleTime: 60_000,
  });

  const overview = overviewQuery.data;
  const kpis = overview?.kpis ?? EMPTY_KPIS;
  const showInlineError = overviewQuery.isError && Boolean(overview);
  const showBlockingError =
    overviewQuery.isError && !overviewQuery.isPending && !overview;
  const showEmptyState =
    !overviewQuery.isPending && !overviewQuery.isError && !hasOverviewData(overview);

  const kpiCards = [
    {
      key: 'users',
      label: 'Пользователи',
      value: formatNumber(kpis.totalUsers, 0),
      icon: <Users className="size-4" />,
      variant: 'default' as const,
      trend: null,
    },
    {
      key: 'subscriptions',
      label: 'Активные подписки',
      value: formatNumber(kpis.activeSubscriptions, 0),
      icon: <CreditCard className="size-4" />,
      variant: 'success' as const,
      trend: {
        value: kpis.activeSubscriptionsRatePercent,
        direction:
          kpis.activeSubscriptionsRatePercent > 0 ? 'up' : 'neutral',
        label: 'от всех пользователей',
      } as const,
    },
    {
      key: 'onboarding',
      label: 'Прошли онбординг',
      value: formatNumber(kpis.onboardingCompletedUsers, 0),
      icon: <CheckCircle2 className="size-4" />,
      variant: 'success' as const,
      trend: {
        value: kpis.onboardingCompletionRatePercent,
        direction:
          kpis.onboardingCompletionRatePercent > 0 ? 'up' : 'neutral',
        label: 'от всех пользователей',
      } as const,
    },
    {
      key: 'accounts',
      label: 'Счета',
      value: formatNumber(kpis.totalAccounts, 0),
      icon: <Wallet className="size-4" />,
      variant: 'default' as const,
      trend: null,
    },
    {
      key: 'transactions-all',
      label: 'Транзакции (всего)',
      value: formatNumber(kpis.totalTransactions, 0),
      icon: <BarChart3 className="size-4" />,
      variant: 'default' as const,
      trend: null,
    },
    {
      key: 'transactions-30d',
      label: 'Транзакции (30 дней)',
      value: formatNumber(kpis.transactionsLast30Days, 0),
      icon: <Clock3 className="size-4" />,
      variant: 'warning' as const,
      trend: null,
    },
  ];

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
        <PageHeader
          title="Админ-панель"
          subtitle="Сводка по пользователям, транзакциям и активности сервиса"
          className="mb-0"
          actions={
            <Button
              className="min-h-[44px] rounded-lg px-4"
              onClick={() => void overviewQuery.refetch()}
              disabled={overviewQuery.isFetching}
            >
              <RefreshCw
                className={`size-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`}
              />
              Обновить
            </Button>
          }
        />

        {showBlockingError ? (
          <section className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm">
            <div className="font-medium text-foreground">
              Не удалось загрузить админ-панель
            </div>
            <div className="mt-1 text-muted-foreground">
              {resolveApiErrorMessage(
                overviewQuery.error,
                'Попробуйте повторить запрос.',
              )}
            </div>
            <Button
              className="mt-3 min-h-[44px] rounded-lg px-4"
              variant="outline"
              onClick={() => void overviewQuery.refetch()}
            >
              Повторить
            </Button>
          </section>
        ) : null}

        {showInlineError ? (
          <section className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm">
            <div className="font-medium text-foreground">
              Не удалось обновить админ-панель
            </div>
            <div className="mt-1 text-muted-foreground">
              {resolveApiErrorMessage(
                overviewQuery.error,
                'Показаны последние доступные данные.',
              )}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map((card) => (
            <KPICard
              key={card.key}
              label={card.label}
              value={card.value}
              icon={card.icon}
              variant={card.variant}
              trend={card.trend}
              loading={overviewQuery.isPending}
            />
          ))}
        </section>

        {showEmptyState ? (
          <EmptyState
            icon={<Inbox />}
            title="Данных для админ-панели пока нет"
            description="Когда в приложении появятся пользователи и транзакции, здесь отобразится сводка."
            className="min-h-[320px] rounded-xl border border-border bg-card/70"
          />
        ) : null}

        {overviewQuery.isPending ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Пользователи (срез)
              </h2>
            </div>
            <Skeleton className="h-[280px] rounded-xl" />
          </section>
        ) : overview?.users.length ? (
          <section className="space-y-3">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                Пользователи (срез)
              </h2>
              <span className="text-sm text-muted-foreground">
                Первые 20 по последней активности
              </span>
            </header>

            <AdminUsersTable users={overview.users} />
          </section>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
