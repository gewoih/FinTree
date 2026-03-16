import { PageHeader } from '@/components/common/PageHeader';
import { useCurrentUser } from '@/features/auth/session';
import { FreedomCalendarHeatmap } from '@/features/freedom/FreedomCalendarHeatmap';
import { FreedomHeroCard } from '@/features/freedom/FreedomHeroCard';
import { FreedomParametersForm } from '@/features/freedom/FreedomParametersForm';
import { useFreedomCalculator } from '@/features/freedom/useFreedomCalculator';

export default function FreedomCalculatorPage() {
  useCurrentUser();

  const {
    calculationError,
    defaults,
    defaultsError,
    defaultsLoading,
    isCalculating,
    params,
    result,
    setParams,
  } = useFreedomCalculator();

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
      <PageHeader title="Калькулятор свободы" className="mb-0" />

      {defaultsError ? (
        <div className="rounded-xl border border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 px-4 py-3 text-sm">
          <div className="font-medium text-foreground">{defaultsError}</div>
          <div className="mt-1 text-muted-foreground">
            Значения можно ввести вручную, расчёт всё равно будет выполняться.
          </div>
        </div>
      ) : null}

      {calculationError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm" aria-live="polite">
          <div className="font-medium text-foreground">{calculationError}</div>
          <div className="mt-1 text-muted-foreground">
            Продолжаем показывать последний успешный расчёт, если он уже был получен.
          </div>
        </div>
      ) : null}

      {isCalculating && result ? (
        <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground" aria-live="polite">
          Пересчитываем сценарий свободы по новым параметрам…
        </div>
      ) : null}

      <FreedomHeroCard result={result} loading={isCalculating || defaultsLoading} />

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-stretch">
        <FreedomParametersForm
          value={params}
          defaults={defaults}
          onChange={setParams}
        />

        <FreedomCalendarHeatmap freeDaysPerYear={result?.freeDaysPerYear ?? 0} />
      </div>
    </div>
  );
}
