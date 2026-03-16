import type { GoalSimulationParametersDto } from '@/types';
import { FormField } from '@/components/common/FormField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import type { GoalParameterField, GoalParameterOverrides } from './goalModels';
import { getGoalParameterDisplayValue, setGoalOverrideValue } from './goalParameterFields';

interface GoalParameterInputProps {
  field: GoalParameterField;
  resolvedParams: GoalSimulationParametersDto;
  overrides: GoalParameterOverrides;
  onChange: (nextOverrides: GoalParameterOverrides) => void;
  variant?: 'compact' | 'panel';
  className?: string;
}

export function GoalParameterInput({
  field,
  resolvedParams,
  overrides,
  onChange,
  variant = 'panel',
  className,
}: GoalParameterInputProps) {
  const isCompact = variant === 'compact';
  const isOverridden = overrides[field.key] != null;

  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-background/40',
        isCompact ? 'p-4' : 'h-full p-4',
        className
      )}
    >
      <div className="mb-3 flex min-h-[44px] items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{field.label}</div>
          {field.hint ? (
            <div className="mt-1 text-xs text-muted-foreground">{field.hint}</div>
          ) : null}
        </div>

        {isOverridden ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="min-h-[32px] rounded-full px-3"
            onClick={() =>
              onChange({
                ...overrides,
                [field.key]: null,
              })
            }
          >
            Сбросить
          </Button>
        ) : (
          <Badge
            variant="secondary"
            className="rounded-full bg-[color-mix(in_srgb,var(--ft-success-500)_16%,transparent)] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[var(--ft-success-400)]"
          >
            авто
          </Badge>
        )}
      </div>

      <FormField label={field.label} labelSrOnly className="gap-0">
        <Input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          inputMode="decimal"
          className={cn(
            'h-11 rounded-xl border-border/80 bg-background/70',
            isCompact && 'bg-background/80'
          )}
          value={getGoalParameterDisplayValue(field, overrides, resolvedParams)}
          onChange={(event) => {
            const nextOverrides = setGoalOverrideValue(field, overrides, event.target.value);

            if (nextOverrides !== overrides) {
              onChange(nextOverrides);
            }
          }}
        />
      </FormField>
    </div>
  );
}
