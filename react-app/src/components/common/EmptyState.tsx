import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center px-8 py-12 text-center',
        className
      )}
    >
      {icon && (
        <div
          className="mb-8 flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-muted/30"
          aria-hidden="true"
        >
          <span className="text-4xl text-muted-foreground">{icon}</span>
        </div>
      )}

      <h3 className="mb-3 text-xl font-semibold text-foreground">{title}</h3>

      {description && (
        <p className="mb-8 max-w-[420px] text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick} className="min-h-[44px] min-w-[180px]">
          {action.label}
        </Button>
      )}
    </div>
  );
}
