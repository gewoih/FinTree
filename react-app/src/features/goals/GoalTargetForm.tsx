import { LoaderCircle, Target } from 'lucide-react';
import type { GoalSimulationParametersDto } from '@/types';
import { FormField } from '@/components/common/FormField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEditableNumber } from '@/utils/format';
import type { GoalParameterOverrides } from './goalModels';
import { GoalParameterInput } from './GoalParameterInput';
import { GOAL_PARAMETER_FIELDS } from './goalParameterFields';

interface GoalTargetFormProps {
  targetAmount: number | null;
  currencyCode: string;
  error: string | null;
  resolvedParams: GoalSimulationParametersDto | null;
  overrides: GoalParameterOverrides;
  defaultsLoading: boolean;
  defaultsError: string | null;
  canRunSimulation: boolean;
  simulationLoading: boolean;
  hasPendingChanges: boolean;
  hasResult: boolean;
  onChange: (value: number | null) => void;
  onOverrideChange: (nextOverrides: GoalParameterOverrides) => void;
  onRunSimulation: () => void;
}

export function GoalTargetForm({
  targetAmount,
  currencyCode,
  error,
  resolvedParams,
  overrides,
  defaultsLoading,
  defaultsError,
  canRunSimulation,
  simulationLoading,
  hasPendingChanges,
  hasResult,
  onChange,
  onOverrideChange,
  onRunSimulation,
}: GoalTargetFormProps) {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardContent className="space-y-5 pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-foreground">Быстрый сценарий</div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Измените цель и сразу скорректируйте автоматические допущения, если хотите
              проверить более консервативный или оптимистичный сценарий.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-[44px] rounded-xl px-5"
              onClick={onRunSimulation}
              disabled={!canRunSimulation}
            >
              {simulationLoading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Target className="size-4" />
              )}
              Пересчитать прогноз
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
          >
            {!hasResult
              ? 'Готово к расчёту'
              : hasPendingChanges
                ? 'Изменения не применены'
                : 'Параметры синхронизированы'}
          </Badge>
          <span>Все поля ниже редактируются вручную, даже если заполнены автоматически.</span>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,1fr))]">
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
            <FormField
              label={`Целевая сумма (${currencyCode})`}
              required
              error={error}
              hint="Главная цель сценария. Прогноз покажет, когда и с какой вероятностью вы к ней придёте."
            >
              <Input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                className="h-11 rounded-xl border-border/80 bg-background/80"
                value={formatEditableNumber(targetAmount, 0)}
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  onChange(raw.length === 0 ? null : Number(raw));
                }}
              />
            </FormField>
          </div>

          {resolvedParams
            ? GOAL_PARAMETER_FIELDS.map((field) => (
                <GoalParameterInput
                  key={field.key}
                  field={field}
                  resolvedParams={resolvedParams}
                  overrides={overrides}
                  onChange={onOverrideChange}
                  variant="compact"
                />
              ))
            : defaultsLoading
              ? GOAL_PARAMETER_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className="rounded-xl border border-border/70 bg-background/40 p-4"
                  >
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="mt-2 h-3 w-20 rounded-md" />
                    <Skeleton className="mt-4 h-11 w-full rounded-xl" />
                  </div>
                ))
              : null}
        </div>

        {defaultsError ? (
          <div className="rounded-xl border border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 px-4 py-3 text-sm">
            <div className="font-medium text-foreground">{defaultsError}</div>
            <div className="mt-1 text-muted-foreground">
              Поля параметров появятся после успешной загрузки ориентиров или после первого расчёта.
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
