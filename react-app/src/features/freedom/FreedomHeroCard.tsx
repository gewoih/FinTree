import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FreedomCalculatorResultDto } from '@/types';
import { formatNumber } from '@/utils/format';
import { pluralizeDays } from './freedomUtils';

interface FreedomHeroCardProps {
  result: FreedomCalculatorResultDto | null;
  loading: boolean;
}

export function FreedomHeroCard({ result, loading }: FreedomHeroCardProps) {
  const freeDays = result?.freeDaysPerYear ?? 0;
  const progressPercent = Math.min(100, ((result?.freeDaysPerYear ?? 0) / 365) * 100);
  const daysLabel = result ? `${pluralizeDays(result.freeDaysPerYear)} свободы в год` : '';
  const percentLabel = result ? `${formatNumber(result.percentToFi, 0)}%` : '—';

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="text-xl font-semibold text-foreground">
          Текущий уровень свободы
        </CardTitle>
        <CardDescription>
          Рассчёт показывает, какую часть года ваши накопления уже могут покрыть без активного дохода.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        {loading && !result ? (
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <Skeleton className="h-16 w-40 rounded-xl" />
              <Skeleton className="h-5 w-52 rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-12 w-28 rounded-xl" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
              <div>
                <div className="text-[clamp(3rem,8vw,4.5rem)] font-semibold leading-none text-foreground [font-variant-numeric:tabular-nums]">
                  {freeDays}
                </div>
                <div className="mt-2 text-base text-muted-foreground">{daysLabel}</div>
              </div>

              <div className="space-y-3">
                <div className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-none text-[var(--ft-success-400)] [font-variant-numeric:tabular-nums]">
                  {percentLabel}
                </div>
                <div className="text-sm text-muted-foreground">к финансовой независимости</div>
                <div
                  className="h-3 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={freeDays}
                  aria-valuemin={0}
                  aria-valuemax={365}
                  aria-label="Прогресс к финансовой независимости в днях свободы"
                >
                  <div
                    className="h-full rounded-full bg-[var(--ft-success-500)] transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
            Настройте параметры, чтобы увидеть расчёт свободы.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
