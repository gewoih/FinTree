import { type DateRange } from "react-day-picker"
import { ru } from "date-fns/locale"
import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { getDisplayDate } from './transactionUtils';

interface DateRangePopoverFieldProps {
  label: string;
  from?: string;
  to?: string;
  onChange: (nextValue: { from?: string; to?: string }) => void;
  max?: string;
  min?: string;
  placeholder?: string;
  className?: string;
  triggerAriaLabel?: string;
}

function getRangeDisplayLabel(
  label: string,
  from?: string,
  to?: string,
  placeholder?: string,
): string {
  if (from && to) {
    return `${getDisplayDate(from)} — ${getDisplayDate(to)}`;
  }

  if (from) {
    return `С ${getDisplayDate(from)}`;
  }

  if (to) {
    return `До ${getDisplayDate(to)}`;
  }

  return placeholder ?? label;
}

function parseDateValue(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDateValue(date?: Date): string | undefined {
  if (!date) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function DateRangePopoverField({
  label,
  from,
  to,
  onChange,
  max,
  min,
  placeholder,
  className,
  triggerAriaLabel,
}: DateRangePopoverFieldProps) {
  const hasValue = Boolean(from || to);
  const selectedRange: DateRange | undefined =
    from || to
      ? {
          from: parseDateValue(from),
          to: parseDateValue(to),
        }
      : undefined;
  const maxDate = parseDateValue(max);
  const minDate = parseDateValue(min);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] flex-1 justify-start rounded-xl px-3"
            aria-label={triggerAriaLabel ?? label}
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className={cn(!hasValue && 'text-muted-foreground')}>
              {getRangeDisplayLabel(label, from, to, placeholder)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto rounded-2xl border border-border bg-popover p-0 shadow-[var(--ft-shadow-sm)]"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-semibold text-foreground">{label}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Выберите начало и конец периода
            </div>
          </div>
          <Calendar
            mode="range"
            defaultMonth={selectedRange?.from ?? selectedRange?.to ?? maxDate ?? new Date()}
            selected={selectedRange}
            locale={ru}
            resetOnSelect
            onSelect={(nextRange) =>
              onChange({
                from: toDateValue(nextRange?.from),
                to: toDateValue(nextRange?.to),
              })
            }
            numberOfMonths={1}
            disabled={(date) =>
              Boolean(
                (maxDate && date > maxDate) ||
                  (minDate && date < minDate),
              )
            }
            className="p-2 md:[--cell-size:--spacing(11)]"
          />
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Новый диапазон начинается с нового первого клика
            </div>
            {hasValue ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={() => onChange({ from: undefined, to: undefined })}
              >
                Сбросить
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {hasValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] rounded-full"
          aria-label="Очистить период"
          onClick={() => onChange({ from: undefined, to: undefined })}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
