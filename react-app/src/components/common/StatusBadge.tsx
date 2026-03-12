import { cn } from '../../utils/cn';

interface StatusBadgeProps {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

const variantClasses: Record<StatusBadgeProps['variant'], string> = {
  success: 'border-[var(--ft-success-500)]/30 bg-[var(--ft-success-500)]/10 text-[var(--ft-success-700,var(--ft-success-500))]',
  warning: 'border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 text-[var(--ft-warning-700,var(--ft-warning-500))]',
  danger:  'border-[var(--ft-danger-500)]/30  bg-[var(--ft-danger-500)]/10  text-[var(--ft-danger-700,var(--ft-danger-500))]',
  info:    'border-[var(--ft-info-500)]/30    bg-[var(--ft-info-500)]/10    text-[var(--ft-info-700,var(--ft-info-500))]',
  neutral: 'border-border bg-muted text-muted-foreground',
};

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
