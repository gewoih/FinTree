import { ArrowUpRight, NotebookPen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import type { RetrospectiveListItemDto } from '@/types';
import {
  formatReflectionMonth,
  formatReflectionRating,
  formatReflectionScore,
  getReflectionPreview,
  getReflectionScorePercent,
  getReflectionScoreTone,
} from './reflectionModels';

interface RetrospectiveMonthCardProps {
  item: RetrospectiveListItemDto;
  onOpen: (month: string) => void;
}

function toneClassName(percent: number | null): string {
  const tone = getReflectionScoreTone(percent);

  if (tone === 'good') {
    return 'border-[var(--ft-success-500)]/25 bg-[color-mix(in_srgb,var(--ft-success-500)_12%,transparent)] text-[var(--ft-success-400)]';
  }

  if (tone === 'average') {
    return 'border-[var(--ft-warning-500)]/25 bg-[color-mix(in_srgb,var(--ft-warning-500)_12%,transparent)] text-[var(--ft-warning-300)]';
  }

  if (tone === 'poor') {
    return 'border-[var(--ft-danger-500)]/25 bg-[color-mix(in_srgb,var(--ft-danger-500)_12%,transparent)] text-[var(--ft-danger-400)]';
  }

  return 'border-border/70 bg-background/35 text-muted-foreground';
}

export function RetrospectiveMonthCard({
  item,
  onOpen,
}: RetrospectiveMonthCardProps) {
  const scorePercent = getReflectionScorePercent(item);
  const preview = getReflectionPreview(item);

  return (
    <button
      type="button"
      onClick={() => onOpen(item.month)}
      aria-label={`Открыть рефлексию за ${formatReflectionMonth(item.month)}`}
      className="group flex h-full flex-col rounded-2xl border border-border/70 bg-[color-mix(in_srgb,var(--ft-surface-raised)_82%,transparent)] p-5 text-left shadow-[var(--ft-shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--ft-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            <NotebookPen className="size-3.5" />
            Рефлексия
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {formatReflectionMonth(item.month)}
          </h3>
        </div>

        <Badge
          variant="outline"
          className={cn('rounded-full px-3 py-1 text-xs font-semibold', toneClassName(scorePercent))}
        >
          {formatReflectionScore(scorePercent)}
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { label: 'Дисциплина', value: item.disciplineRating },
          { label: 'Импульсы', value: item.impulseControlRating },
          { label: 'Уверенность', value: item.confidenceRating },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-border/60 bg-background/25 px-3 py-3"
          >
            <div className="text-[0.72rem] font-medium text-muted-foreground">
              {metric.label}
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {formatReflectionRating(metric.value)}
              <span className="ml-1 text-sm text-muted-foreground">/5</span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {preview ?? 'Пока без заметок. Можно открыть месяц и добавить выводы позже.'}
      </p>

      <div className="mt-auto flex items-center justify-between pt-5 text-sm">
        <span className="text-muted-foreground">
          {item.hasContent ? 'Есть заметки и выводы' : 'Пока только оценки'}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-foreground transition-transform group-hover:translate-x-0.5">
          Открыть
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </button>
  );
}
