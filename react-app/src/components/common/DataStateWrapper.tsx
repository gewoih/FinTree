import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from './EmptyState';

export type DataState = 'idle' | 'loading' | 'error' | 'empty' | 'success';

interface DataStateWrapperProps {
  state: DataState;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  loadingRows?: number;
  children: ReactNode;
  className?: string;
}

const BASE_SKELETON_KEYS = ['one', 'two', 'three', 'four', 'five', 'six'];

function getSkeletonKeys(loadingRows: number): string[] {
  if (loadingRows <= BASE_SKELETON_KEYS.length) {
    return BASE_SKELETON_KEYS.slice(0, loadingRows);
  }

  const generatedKeys = Array.from(
    { length: loadingRows - BASE_SKELETON_KEYS.length },
    () => `extra-${Math.random().toString(36).slice(2, 10)}`
  );

  return [...BASE_SKELETON_KEYS, ...generatedKeys];
}

export function DataStateWrapper({
  state,
  error,
  onRetry,
  emptyTitle = 'Нет данных',
  emptyDescription,
  emptyAction,
  loadingRows = 3,
  children,
  className,
}: DataStateWrapperProps) {
  if (state === 'idle') {
    return null;
  }

  if (state === 'loading') {
    return (
      <div
        className={cn('flex flex-col gap-2', className)}
        role="status"
        aria-busy="true"
        aria-label="Загрузка"
      >
        {getSkeletonKeys(loadingRows).map((key) => (
          <Skeleton key={key} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center',
          className
        )}
        role="alert"
      >
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />

        <div className="flex flex-col gap-1">
          <p className="font-medium text-foreground">Не удалось загрузить данные</p>
          {error && <p className="text-sm text-muted-foreground">{error}</p>}
        </div>

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={onRetry}
          >
            Повторить
          </Button>
        )}
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    );
  }

  return <>{children}</>;
}
