import type { SummaryMetric } from '@/components/analytics/models';
import { SummaryStrip } from '@/components/analytics/SummaryStrip';

interface InvestmentsSummaryProps {
  loading: boolean;
  error: string | null;
  metrics: SummaryMetric[];
  onRetry: () => void;
}

export function InvestmentsSummary({
  loading,
  error,
  metrics,
  onRetry,
}: InvestmentsSummaryProps) {
  return (
    <SummaryStrip
      loading={loading}
      error={error}
      metrics={metrics}
      onRetry={onRetry}
    />
  );
}
