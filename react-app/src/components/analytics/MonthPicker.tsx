import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

interface MonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  maxDate?: Date;
}

export function MonthPicker({
  value,
  onChange,
  maxDate,
}: MonthPickerProps) {
  const [pickerYear, setPickerYear] = useState(value.getFullYear());
  const monthLimit = startOfMonth(maxDate ?? new Date());

  useEffect(() => {
    setPickerYear(value.getFullYear());
  }, [value]);

  return (
    <div className="w-64 p-3">
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPickerYear((year) => year - 1)}
          aria-label="Предыдущий год"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold">{pickerYear}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPickerYear((year) => year + 1)}
          disabled={pickerYear >= monthLimit.getFullYear()}
          aria-label="Следующий год"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTHS_RU.map((monthName, monthIndex) => {
          const monthDate = new Date(pickerYear, monthIndex, 1);
          const isDisabled = monthDate > monthLimit;
          const isSelected = isSameMonth(monthDate, value);

          return (
            <button
              key={monthName}
              type="button"
              disabled={isDisabled}
              aria-label={`Выбрать ${monthName.toLowerCase()} ${pickerYear}`}
              aria-pressed={isSelected}
              onClick={() => onChange(monthDate)}
              className={cn(
                'min-h-[44px] rounded-md px-2 py-2.5 text-sm transition-colors',
                isSelected
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'text-foreground hover:bg-muted',
                isDisabled && 'cursor-not-allowed opacity-40',
              )}
            >
              {monthName.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
