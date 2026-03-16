import { useId } from 'react';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { FreedomCalculatorDefaultsDto } from '@/types';
import { cn } from '@/utils/cn';
import { formatEditableNumber } from '@/utils/format';
import type { FreedomFormState } from './freedomModels';

const CAPITAL_CHIPS = [1_000_000, 3_000_000, 5_000_000, 10_000_000];
const EXPENSES_CHIPS = [50_000, 100_000, 150_000, 200_000];
const SWR_CHIPS = [3, 3.5, 4, 4.5];
const INFLATION_CHIPS = [3, 5, 7, 10];

function formatCapitalChip(value: number): string {
  return value >= 1_000_000 ? `${value / 1_000_000} млн` : `${value / 1_000}k`;
}

function formatExpensesChip(value: number): string {
  return `${value / 1_000}k`;
}

function ChipRow({
  values,
  currentValue,
  onSelect,
  formatValue,
}: {
  values: number[];
  currentValue: number;
  onSelect: (value: number) => void;
  formatValue: (value: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const isActive = currentValue === value;

        return (
          <Button
            key={value}
            type="button"
            variant="outline"
            aria-pressed={isActive}
            className={cn(
              'min-h-[46px] rounded-xl border-border/70 bg-muted/10 px-4 text-base text-foreground/90 transition-[border-color,background-color,color,box-shadow] hover:border-primary/30 hover:bg-primary/5',
              isActive &&
                'border-[var(--ft-primary-300)] bg-[var(--ft-primary-400)] text-[var(--ft-primary-950)] shadow-[0_10px_24px_color-mix(in_srgb,var(--ft-primary-950)_25%,transparent)] hover:bg-[var(--ft-primary-300)]'
            )}
            onClick={() => onSelect(value)}
          >
            {formatValue(value)}
          </Button>
        );
      })}
    </div>
  );
}

function RangeInput({
  min,
  max,
  step,
  value,
  onChange,
  ariaLabel,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  const progressPercent =
    max === min ? 0 : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      className="h-6 w-full cursor-pointer appearance-none rounded-full bg-transparent outline-none transition-opacity focus-visible:ring-0 [&::-webkit-slider-runnable-track]:h-2.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--ft-surface-base)] [&::-webkit-slider-thumb]:bg-[var(--ft-primary-300)] [&::-webkit-slider-thumb]:shadow-[0_6px_18px_color-mix(in_srgb,var(--ft-primary-950)_40%,transparent)] [&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-none [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--ft-surface-base)] [&::-moz-range-thumb]:bg-[var(--ft-primary-300)] [&::-moz-range-thumb]:shadow-[0_6px_18px_color-mix(in_srgb,var(--ft-primary-950)_40%,transparent)]"
      style={{
        background: `linear-gradient(90deg, var(--ft-primary-400) 0%, var(--ft-primary-400) ${progressPercent}%, color-mix(in srgb, var(--ft-border-default) 78%, transparent) ${progressPercent}%, color-mix(in srgb, var(--ft-border-default) 78%, transparent) 100%)`,
      }}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

interface FreedomParametersFormProps {
  value: FreedomFormState;
  defaults: FreedomCalculatorDefaultsDto | null;
  onChange: (nextValue: FreedomFormState) => void;
}

export function FreedomParametersForm({
  value,
  defaults,
  onChange,
}: FreedomParametersFormProps) {
  const inflationSwitchId = useId();
  const isCapitalAuto =
    defaults != null && Math.abs(value.capital - defaults.capital) < 1;
  const isExpensesAuto =
    defaults != null && Math.abs(value.monthlyExpenses - defaults.monthlyExpenses) < 1;

  function update(patch: Partial<FreedomFormState>) {
    onChange({ ...value, ...patch });
  }

  return (
    <Card className="h-full rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Параметры расчёта
        </CardTitle>
        <CardDescription>
          Меняйте капитал, расходы и допущения, чтобы пересчитывать сценарий свободы.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Капитал / накопления</span>
            {isCapitalAuto && defaults ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--ft-success-500)_16%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--ft-success-400)]">
                авто
              </span>
            ) : defaults ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-[32px] rounded-full px-3 text-xs"
                onClick={() => update({ capital: defaults.capital })}
              >
                Сбросить
              </Button>
            ) : null}
          </div>
          <FormField label="Капитал" labelSrOnly>
            <Input
              type="number"
              min="0"
              max="50000000"
              step="1000"
              inputMode="decimal"
              className="h-11 rounded-xl"
              value={formatEditableNumber(value.capital, 2)}
              onChange={(event) => update({ capital: Number(event.target.value) || 0 })}
            />
          </FormField>
          <RangeInput
            min={0}
            max={50_000_000}
            step={100_000}
            value={value.capital}
            ariaLabel="Капитал"
            onChange={(nextValue) => update({ capital: nextValue })}
          />
          <ChipRow
            values={CAPITAL_CHIPS}
            currentValue={value.capital}
            onSelect={(nextValue) => update({ capital: nextValue })}
            formatValue={formatCapitalChip}
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Расходы в месяц</span>
            {isExpensesAuto && defaults ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--ft-success-500)_16%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--ft-success-400)]">
                авто
              </span>
            ) : defaults ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-[32px] rounded-full px-3 text-xs"
                onClick={() => update({ monthlyExpenses: defaults.monthlyExpenses })}
              >
                Сбросить
              </Button>
            ) : null}
          </div>
          <FormField label="Расходы в месяц" labelSrOnly>
            <Input
              type="number"
              min="0"
              max="500000"
              step="1000"
              inputMode="decimal"
              className="h-11 rounded-xl"
              value={formatEditableNumber(value.monthlyExpenses, 2)}
              onChange={(event) =>
                update({ monthlyExpenses: Number(event.target.value) || 0 })
              }
            />
          </FormField>
          <RangeInput
            min={0}
            max={500_000}
            step={1_000}
            value={value.monthlyExpenses}
            ariaLabel="Расходы в месяц"
            onChange={(nextValue) => update({ monthlyExpenses: nextValue })}
          />
          <ChipRow
            values={EXPENSES_CHIPS}
            currentValue={value.monthlyExpenses}
            onSelect={(nextValue) => update({ monthlyExpenses: nextValue })}
            formatValue={formatExpensesChip}
          />
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold text-foreground">Безопасная ставка изъятия</div>
          <FormField label="Безопасная ставка изъятия" labelSrOnly>
            <Input
              type="number"
              min="1"
              max="10"
              step="0.1"
              inputMode="decimal"
              className="h-11 rounded-xl"
              value={formatEditableNumber(value.swrPercent, 1)}
              onChange={(event) => update({ swrPercent: Number(event.target.value) || 0 })}
            />
          </FormField>
          <RangeInput
            min={1}
            max={10}
            step={0.1}
            value={value.swrPercent}
            ariaLabel="Безопасная ставка изъятия"
            onChange={(nextValue) => update({ swrPercent: nextValue })}
          />
          <ChipRow
            values={SWR_CHIPS}
            currentValue={value.swrPercent}
            onSelect={(nextValue) => update({ swrPercent: nextValue })}
            formatValue={(chip) => `${chip}%`}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/15 px-4 py-3">
            <label htmlFor={inflationSwitchId} className="min-w-0 cursor-pointer">
              <div className="text-sm font-semibold text-foreground">
                Учитывать инфляцию в расходах
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Добавляет рост ежемесячных расходов в расчёт свободы.
              </div>
            </label>

            <div className="flex shrink-0 items-center gap-3">
              <span
                className={cn(
                  'text-xs font-medium',
                  value.inflationEnabled ? 'text-[var(--ft-success-400)]' : 'text-muted-foreground'
                )}
              >
                {value.inflationEnabled ? 'вкл' : 'выкл'}
              </span>
              <Switch
                id={inflationSwitchId}
                checked={value.inflationEnabled}
                onCheckedChange={(checked) => update({ inflationEnabled: checked })}
                aria-label="Учитывать инфляцию в расходах"
                className="data-[state=checked]:bg-[var(--ft-primary-500)] data-[state=unchecked]:bg-[color-mix(in_srgb,var(--ft-border-default)_82%,transparent)]"
              />
            </div>
          </div>

          {value.inflationEnabled ? (
            <>
              <FormField label="Личная инфляция" hint="% в год">
                <Input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  inputMode="decimal"
                  className="h-11 rounded-xl"
                  value={formatEditableNumber(value.inflationRatePercent, 1)}
                  onChange={(event) =>
                    update({ inflationRatePercent: Number(event.target.value) || 0 })
                  }
                />
              </FormField>
              <RangeInput
                min={0}
                max={20}
                step={0.5}
                value={value.inflationRatePercent}
                ariaLabel="Личная инфляция"
                onChange={(nextValue) => update({ inflationRatePercent: nextValue })}
              />
              <ChipRow
                values={INFLATION_CHIPS}
                currentValue={value.inflationRatePercent}
                onSelect={(nextValue) => update({ inflationRatePercent: nextValue })}
                formatValue={(chip) => `${chip}%`}
              />
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
