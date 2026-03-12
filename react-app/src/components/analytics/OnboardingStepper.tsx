import { CheckCircle2, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
  actionLabel: string;
  actionTo: string;
}

interface OnboardingStepperProps {
  steps: OnboardingStep[];
  loading: boolean;
  onStepClick: (step: OnboardingStep) => void;
  onSkip: () => void;
}

// ─── Step status ──────────────────────────────────────────────────────────────

type StepStatus = 'completed' | 'current' | 'locked' | 'optional';

function resolveStatus(step: OnboardingStep, currentKey: string | null): StepStatus {
  if (step.completed) return 'completed';
  if (step.optional) return 'optional';
  if (step.key === currentKey) return 'current';
  return 'locked';
}

function findCurrentKey(steps: OnboardingStep[]): string | null {
  const first = steps.find((s) => !s.completed && !s.optional);
  return first?.key ?? null;
}

// ─── StepBadge ────────────────────────────────────────────────────────────────

interface StepBadgeProps {
  index: number;
  status: StepStatus;
}

function StepBadge({ index, status }: StepBadgeProps) {
  const base =
    'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors';

  if (status === 'completed') {
    return (
      <span
        className={cn(base, 'bg-success/15')}
        style={{ color: 'var(--ft-success-500)' }}
        aria-hidden="true"
      >
        <CheckCircle2 className="size-4.5" />
      </span>
    );
  }

  if (status === 'locked') {
    return (
      <span
        className={cn(base, 'bg-muted text-muted-foreground')}
        aria-hidden="true"
      >
        <Lock className="size-4" />
      </span>
    );
  }

  if (status === 'current') {
    return (
      <span
        className={cn(base, 'text-sm font-bold')}
        style={{
          background: 'var(--ft-primary-400)',
          color: 'var(--color-card)',
        }}
        aria-hidden="true"
      >
        {index + 1}
      </span>
    );
  }

  // optional
  return (
    <span
      className={cn(base, 'border border-dashed border-border bg-muted/30 text-muted-foreground')}
      aria-hidden="true"
    >
      {index + 1}
    </span>
  );
}

// ─── StepRow ──────────────────────────────────────────────────────────────────

interface StepRowProps {
  step: OnboardingStep;
  index: number;
  status: StepStatus;
  onStepClick: (step: OnboardingStep) => void;
  isLast: boolean;
}

function StepRow({ step, index, status, onStepClick, isLast }: StepRowProps) {
  const showAction = status === 'current' || status === 'optional';
  const isCompleted = status === 'completed';
  const isLocked = status === 'locked';

  return (
    <li
      className={cn(
        'flex gap-4 py-4',
        !isLast && 'border-b border-border',
        isCompleted && 'opacity-60',
        isLocked && 'opacity-45',
      )}
    >
      <StepBadge index={index} status={status} />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span
          className={cn(
            'text-sm font-medium leading-snug text-foreground',
            isCompleted && 'line-through',
          )}
        >
          {step.title}
          {step.optional && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(необязательно)</span>
          )}
        </span>

        {showAction && (
          <>
            <p className="text-xs text-muted-foreground">{step.description}</p>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'mt-1 min-h-[44px] self-start sm:self-auto',
                'max-sm:w-full',
                status === 'optional' && 'border-dashed',
              )}
              onClick={() => onStepClick(step)}
              aria-label={`${step.actionLabel}: ${step.title}`}
            >
              {step.actionLabel}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

// ─── OnboardingStepper ────────────────────────────────────────────────────────

export function OnboardingStepper({
  steps,
  loading,
  onStepClick,
  onSkip,
}: OnboardingStepperProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  const currentKey = findCurrentKey(steps);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-border"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, var(--ft-primary-400) 10%, var(--color-card)), color-mix(in srgb, var(--ft-info-500, #38bdf8) 8%, var(--color-card)))`,
      }}
    >
      <div className="px-4 pt-5 pb-1">
        <h2 className="text-base font-semibold text-foreground">Начало работы</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Выполните шаги, чтобы получить полную аналитику
        </p>
      </div>

      <ol className="px-4" aria-label="Шаги онбординга">
        {steps.map((step, i) => {
          const status = resolveStatus(step, currentKey);
          return (
            <StepRow
              key={step.key}
              step={step}
              index={i}
              status={status}
              onStepClick={onStepClick}
              isLast={i === steps.length - 1}
            />
          );
        })}
      </ol>

      <div className="flex justify-center px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] text-muted-foreground"
          onClick={onSkip}
        >
          Пропустить пока
        </Button>
      </div>
    </div>
  );
}
