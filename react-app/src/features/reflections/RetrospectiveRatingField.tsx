import { cn } from '@/utils/cn';

interface RetrospectiveRatingFieldProps {
  label: string;
  hint: string;
  value: number | null;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}

export function RetrospectiveRatingField({
  label,
  hint,
  value,
  disabled = false,
  onChange,
}: RetrospectiveRatingFieldProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <p className="text-sm leading-6 text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-full border border-border/70 bg-background/35 px-3 py-1 text-sm text-muted-foreground">
          {value ?? '—'}/5
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, index) => {
          const score = index + 1;
          const active = value != null && score <= value;
          const selected = value === score;

          return (
            <button
              key={score}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${label}: ${score}`}
              onClick={() => onChange(selected ? null : score)}
              className={cn(
                'flex size-11 items-center justify-center rounded-xl border text-sm font-semibold transition-colors',
                active
                  ? 'border-primary/35 bg-primary/15 text-primary'
                  : 'border-border/70 bg-background/30 text-muted-foreground hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}
