import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { GoalSimulationParametersDto } from '@/types';
import { formatEditableNumber } from '@/utils/format';
import type { GoalParameterField, GoalParameterOverrides } from './goalModels';
import { resolveGoalParamValue } from './goalUtils';

const GOAL_PARAMETER_FIELDS: GoalParameterField[] = [
  {
    key: 'initialCapital',
    label: 'Начальный капитал',
    min: 0,
    max: 1_000_000_000_000,
    step: 1_000,
  },
  {
    key: 'monthlyIncome',
    label: 'Ежемесячный доход',
    min: 0,
    max: 1_000_000_000,
    step: 1_000,
  },
  {
    key: 'monthlyExpenses',
    label: 'Ежемесячные расходы',
    min: 0,
    max: 1_000_000_000,
    step: 1_000,
  },
  {
    key: 'annualReturnRate',
    label: 'Доходность инвестиций',
    hint: '% годовых',
    isPercent: true,
    min: 0,
    max: 100,
    step: 0.1,
  },
];

function getDisplayValue(
  field: GoalParameterField,
  overrides: GoalParameterOverrides,
  resolvedParams: GoalSimulationParametersDto
): string {
  const currentValue = overrides[field.key] ?? resolveGoalParamValue(resolvedParams, field.key);
  const displayValue = field.isPercent ? currentValue * 100 : currentValue;

  if (!Number.isFinite(displayValue)) {
    return '';
  }

  return formatEditableNumber(displayValue, field.isPercent ? 1 : 2);
}

interface GoalParametersPanelProps {
  resolvedParams: GoalSimulationParametersDto;
  overrides: GoalParameterOverrides;
  onChange: (nextOverrides: GoalParameterOverrides) => void;
}

export function GoalParametersPanel({
  resolvedParams,
  overrides,
  onChange,
}: GoalParametersPanelProps) {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Параметры симуляции
        </CardTitle>
        <CardDescription>
          Значения можно оставить автоматическими или скорректировать вручную.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {GOAL_PARAMETER_FIELDS.map((field) => {
            const isOverridden = overrides[field.key] != null;

            return (
              <div
                key={field.key}
                className="rounded-2xl border border-border/70 bg-muted/15 p-4"
              >
                <div className="mb-3 flex min-h-[44px] flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                    {field.label}
                  </span>
                  {!isOverridden ? (
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--ft-success-500)_16%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--ft-success-400)]">
                      авто
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-[32px] rounded-full px-3 text-xs"
                      onClick={() =>
                        onChange({
                          ...overrides,
                          [field.key]: null,
                        })
                      }
                    >
                      Сбросить
                    </Button>
                  )}
                </div>

                <FormField
                  label={field.label}
                  labelSrOnly
                  hint={field.hint}
                >
                  <Input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step ?? 1}
                    inputMode="decimal"
                    className="h-11 rounded-xl"
                    value={getDisplayValue(field, overrides, resolvedParams)}
                    onChange={(event) => {
                      const raw = event.target.value.trim();

                      if (raw.length === 0) {
                        onChange({
                          ...overrides,
                          [field.key]: null,
                        });
                        return;
                      }

                      const parsed = Number(raw);
                      if (Number.isNaN(parsed)) {
                        return;
                      }

                      onChange({
                        ...overrides,
                        [field.key]: field.isPercent ? parsed / 100 : parsed,
                      });
                    }}
                  />
                </FormField>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
