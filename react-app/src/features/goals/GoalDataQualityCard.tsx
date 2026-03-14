import { Card, CardContent } from '@/components/ui/card';
import type { GoalDataQualityModel } from './goalModels';

interface GoalDataQualityCardProps {
  quality: GoalDataQualityModel;
}

const QUALITY_STYLES: Record<GoalDataQualityModel['tone'], { border: string; text: string }> = {
  high: {
    border: 'border-[color-mix(in_srgb,var(--ft-success-500)_42%,transparent)]',
    text: 'text-[var(--ft-success-400)]',
  },
  medium: {
    border: 'border-[color-mix(in_srgb,var(--ft-warning-500)_42%,transparent)]',
    text: 'text-[var(--ft-warning-400)]',
  },
  low: {
    border: 'border-[color-mix(in_srgb,var(--ft-danger-500)_42%,transparent)]',
    text: 'text-[var(--ft-danger-400)]',
  },
};

export function GoalDataQualityCard({ quality }: GoalDataQualityCardProps) {
  const style = QUALITY_STYLES[quality.tone];

  return (
    <Card className={`rounded-2xl border bg-card/95 shadow-[var(--ft-shadow-sm)] ${style.border}`}>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">{quality.label}</div>
            <p className="mt-2 text-sm text-muted-foreground">{quality.description}</p>
          </div>
          <div className={`text-lg font-semibold [font-variant-numeric:tabular-nums] ${style.text}`}>
            {quality.scorePercent}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
