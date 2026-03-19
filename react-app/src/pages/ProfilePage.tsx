import { AlertCircle, Check, CreditCard, Shield } from 'lucide-react';
import { type ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FormField } from '@/components/common/FormField';
import { PageHeader } from '@/components/common/PageHeader';
import type { CurrentUserDto, Currency, SubscriptionPaymentDto, SubscriptionPlan } from '@/types';
import { resolveApiErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';
import { PATHS } from '@/router/paths';
import { useProfilePage } from '@/features/profile/useProfilePage';

function formatDateLabel(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getPlanTitle(plan: SubscriptionPlan): string {
  return plan === 'Year' ? '12 месяцев' : '1 месяц';
}

function getPaymentStatusLabel(status: SubscriptionPaymentDto['status']): string {
  switch (status) {
    case 'Succeeded': return 'Успешно';
    case 'Failed': return 'Ошибка';
    case 'Refunded': return 'Возврат';
    case 'Canceled': return 'Отменено';
    default: return status;
  }
}

function SubscriptionStatusBadge({ user }: { user: CurrentUserDto }) {
  const isActive = user.subscription.isActive;

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold',
        isActive
          ? 'border-[var(--ft-success-500)]/30 bg-[color-mix(in_srgb,var(--ft-success-500)_12%,transparent)] text-[var(--ft-success-400)]'
          : 'border-[var(--ft-warning-500)]/30 bg-[color-mix(in_srgb,var(--ft-warning-500)_10%,transparent)] text-[var(--ft-warning-300)]',
      )}
    >
      {isActive ? 'Активна' : 'Только просмотр'}
    </Badge>
  );
}

function PageCard({
  title,
  description,
  actions,
  children,
  muted = false,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      className="rounded-xl border px-5 py-5 shadow-[var(--ft-shadow-sm)]"
      style={{
        borderColor: 'color-mix(in srgb, var(--ft-primary-400) 10%, var(--ft-border-default))',
        backgroundColor: muted
          ? 'color-mix(in srgb, var(--ft-surface-raised) 62%, var(--ft-surface-base))'
          : 'color-mix(in srgb, var(--ft-surface-raised) 74%, var(--ft-surface-base))',
      }}
    >
      {title ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center">{actions}</div> : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}

function PaymentHistoryList({
  payments,
  loading,
}: {
  payments: SubscriptionPaymentDto[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3 pt-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[58px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <p className="pt-2 text-sm text-muted-foreground">
        Оплат пока нет. После mock-оплаты запись появится здесь.
      </p>
    );
  }

  return (
    <ul className="space-y-3 pt-2">
      {payments.map((payment) => (
        <li
          key={payment.id}
          className="flex flex-col gap-3 rounded-lg border border-border bg-background/35 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              {getPlanTitle(payment.plan)} · {getPaymentStatusLabel(payment.status)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTimeLabel(payment.paidAtUtc)} · Период:{' '}
              {formatDateLabel(payment.subscriptionStartsAtUtc)} - {formatDateLabel(payment.subscriptionEndsAtUtc)}
            </p>
          </div>
          <div className="text-sm text-muted-foreground sm:text-right">
            <p className="font-semibold text-foreground">
              Списано: {formatCurrency(payment.chargedPriceRub, 'RUB')}
            </p>
            <p className="mt-1 text-xs">
              Тариф: {formatCurrency(payment.listedPriceRub, 'RUB')}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ProfilePage() {
  const {
    navigate,
    currentUserQuery,
    currentUser,
    form,
    telegramUserIdValue,
    currenciesQuery,
    paymentsQuery,
    saveProfileMutation,
    simulatePaymentMutation,
    handleProfileSubmit,
    handlePay,
    subscriptionError,
    isReadOnlyMode,
    isSubscriptionActive,
    initials,
    paymentPlans,
  } = useProfilePage();

  if (currentUserQuery.isPending && !currentUser) {
    return (
      <ErrorBoundary>
        <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
          <PageHeader title="Настройки" className="mb-0" />
          <Skeleton className="h-[140px] rounded-xl" />
          <Skeleton className="h-[280px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
      </ErrorBoundary>
    );
  }

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
          <PageHeader title="Настройки" className="mb-0" />
          <PageCard
            title="Не удалось загрузить настройки"
            description={resolveApiErrorMessage(
              currentUserQuery.error,
              'Попробуйте обновить данные пользователя ещё раз.',
            )}
            actions={
              <Button
                className="min-h-[44px] rounded-lg px-4"
                onClick={() => void currentUserQuery.refetch()}
              >
                Повторить
              </Button>
            }
          >
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>Данные профиля недоступны. Остальные действия временно заблокированы.</span>
            </div>
          </PageCard>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
        <PageHeader title="Настройки" className="mb-0" />

        {currentUser.isOwner ? (
          <PageCard
            title="Админ-панель"
            description="Просматривайте ключевые метрики сервиса: пользователей, транзакции и операционную активность."
            actions={
              <Button className="min-h-[44px] rounded-lg px-4" onClick={() => void navigate({ to: PATHS.ADMIN })}>
                <Shield className="size-4" />
                Открыть админ-панель
              </Button>
            }
          >
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background/35 px-4 py-3 text-sm text-muted-foreground">
              <Shield className="size-4 text-primary" />
              Владелец аккаунта имеет доступ к административному разделу.
            </div>
          </PageCard>
        ) : null}

        <PageCard muted>
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold shadow-[var(--ft-shadow-sm)]"
              style={{ backgroundColor: 'var(--ft-primary-500)', color: 'var(--ft-text-inverse)' }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-foreground">{currentUser.name ?? '—'}</p>
              <p className="truncate text-sm text-muted-foreground">{currentUser.email ?? '—'}</p>
            </div>
          </div>
        </PageCard>

        <PageCard title="Основные настройки" description="Управляйте базовой валютой и Telegram-ботом.">
          <form className="space-y-5" onSubmit={handleProfileSubmit} noValidate>
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField
                label="Базовая валюта"
                required
                error={form.formState.errors.baseCurrencyCode?.message}
                hint={
                  currenciesQuery.isLoading
                    ? 'Загрузка доступных валют…'
                    : currenciesQuery.isError
                      ? 'Не удалось загрузить валюты. Повторите позже.'
                      : 'В этой валюте считается вся аналитика и отчеты.'
                }
              >
                <Controller
                  control={form.control}
                  name="baseCurrencyCode"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={
                        currenciesQuery.isLoading ||
                        currenciesQuery.isError ||
                        saveProfileMutation.isPending ||
                        isReadOnlyMode
                      }
                    >
                      <SelectTrigger className="h-11 w-full rounded-lg">
                        <SelectValue placeholder="Выберите валюту" />
                      </SelectTrigger>
                      <SelectContent>
                        {(currenciesQuery.data ?? []).map((currency: Currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code} · {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label="Telegram-бот"
                error={form.formState.errors.telegramUserId?.message}
                hint="Отправьте /id боту @financetree_bot и вставьте цифры сюда. Оставьте пустым, чтобы отвязать."
              >
                <div className="flex gap-2">
                  <Input
                    placeholder="123456789"
                    autoComplete="off"
                    disabled={saveProfileMutation.isPending || isReadOnlyMode}
                    {...form.register('telegramUserId')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] shrink-0 rounded-lg px-4"
                    disabled={!telegramUserIdValue || saveProfileMutation.isPending || isReadOnlyMode}
                    onClick={() => form.setValue('telegramUserId', '', { shouldDirty: true, shouldValidate: true })}
                  >
                    Очистить
                  </Button>
                </div>
              </FormField>
            </div>

            {form.formState.errors.root?.message ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{form.formState.errors.root.message}</span>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] rounded-lg px-4"
                disabled={!form.formState.isDirty || saveProfileMutation.isPending || isReadOnlyMode}
                onClick={() =>
                  form.reset({
                    baseCurrencyCode: currentUser.baseCurrencyCode,
                    telegramUserId: currentUser.telegramUserId != null ? String(currentUser.telegramUserId) : '',
                  })
                }
              >
                Сбросить
              </Button>
              <Button
                type="submit"
                className="min-h-[44px] rounded-lg px-4"
                disabled={!form.formState.isDirty || saveProfileMutation.isPending || isReadOnlyMode}
              >
                <Check className="size-4" />
                Сохранить
              </Button>
            </div>
          </form>
        </PageCard>

        <PageCard
          title="Подписка"
          description="Управляйте доступом к полному режиму приложения."
          actions={<SubscriptionStatusBadge user={currentUser} />}
        >
          <p className="text-sm text-muted-foreground">
            {isSubscriptionActive ? (
              <>
                Активна до <strong className="text-foreground">{formatDateLabel(currentUser.subscription.expiresAtUtc)}</strong>
              </>
            ) : (
              'Сейчас доступен только режим просмотра.'
            )}
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {paymentPlans.map((plan) => (
              <article
                key={plan.plan}
                className="rounded-xl border border-border bg-background/35 p-4 shadow-[var(--ft-shadow-sm)]"
              >
                <h3 className="text-base font-semibold text-foreground">{plan.title}</h3>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-primary">
                  {formatCurrency(plan.price, 'RUB')}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.hint}</p>
                <Button
                  className="mt-4 min-h-[44px] rounded-lg px-4"
                  disabled={simulatePaymentMutation.isPending || isSubscriptionActive}
                  onClick={() => void handlePay(plan.plan)}
                >
                  <CreditCard className="size-4" />
                  Оплатить
                </Button>
              </article>
            ))}
          </div>

          {subscriptionError ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{subscriptionError}</span>
            </div>
          ) : null}

          <p className="mt-4 text-sm text-muted-foreground">
            Сейчас оплата имитируется: при нажатии «Оплатить» выдается бесплатный доступ на 1 месяц.
          </p>
        </PageCard>

        <PageCard muted>
          <Accordion type="single" collapsible defaultValue="payments">
            <AccordionItem value="payments" className="border-none bg-transparent shadow-none">
              <AccordionTrigger className="px-0 py-0 hover:text-foreground">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-foreground">История оплат</span>
                  {paymentsQuery.data?.length ? (
                    <Badge variant="outline" className="rounded-full px-2.5">
                      {paymentsQuery.data.length}
                    </Badge>
                  ) : null}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                {paymentsQuery.isError ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>
                        {resolveApiErrorMessage(
                          paymentsQuery.error,
                          'Не удалось загрузить историю оплат.',
                        )}
                      </span>
                    </div>
                    <Button
                      className="min-h-[44px] rounded-lg px-4"
                      variant="outline"
                      onClick={() => void paymentsQuery.refetch()}
                    >
                      Повторить
                    </Button>
                  </div>
                ) : (
                  <PaymentHistoryList
                    payments={paymentsQuery.data ?? []}
                    loading={paymentsQuery.isLoading}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </PageCard>
      </div>
    </ErrorBoundary>
  );
}
