import { cn } from '../../utils/cn';

interface StatusBadgeProps {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

const variantClasses: Record<StatusBadgeProps['variant'], string> = {
  success: 'border-green-500/30 bg-green-500/10 text-green-600',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600',
  danger: 'border-red-500/30 bg-red-500/10 text-red-600',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-600',
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
