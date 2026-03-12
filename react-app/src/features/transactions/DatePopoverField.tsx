import { CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { getDisplayDate } from './transactionUtils';

interface DatePopoverFieldProps {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
  max?: string;
  min?: string;
  placeholder?: string;
  className?: string;
}

export function DatePopoverField({
  label,
  value,
  onChange,
  max,
  min,
  placeholder,
  className,
}: DatePopoverFieldProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] flex-1 justify-start rounded-xl px-3"
          >
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className={cn(!value && 'text-muted-foreground')}>
              {value ? `${label}: ${getDisplayDate(value)}` : placeholder ?? label}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto min-w-64 rounded-2xl p-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{label}</div>
            <Input
              type="date"
              value={value ?? ''}
              min={min}
              max={max}
              className="h-11 rounded-xl"
              onChange={(event) => onChange(event.target.value || undefined)}
            />
          </div>
        </PopoverContent>
      </Popover>

      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] rounded-full"
          aria-label={`Очистить дату ${label.toLowerCase()}`}
          onClick={() => onChange(undefined)}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
