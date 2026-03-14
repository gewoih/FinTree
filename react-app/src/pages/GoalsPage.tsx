import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserStore } from '@/stores/userStore';
import { GoalDataQualityCard } from '@/features/goals/GoalDataQualityCard';
import { GoalFanChartCard } from '@/features/goals/GoalFanChartCard';
import { GoalParametersPanel } from '@/features/goals/GoalParametersPanel';
import { GoalProjectionSummary } from '@/features/goals/GoalProjectionSummary';
import { GoalTargetForm } from '@/features/goals/GoalTargetForm';
import { useGoalSimulation } from '@/features/goals/useGoalSimulation';

export default function GoalsPage() {
  const baseCurrencyCode =
    useUserStore((state) => state.currentUser?.baseCurrencyCode) ?? 'RUB';
  const {
    achievementRangeText,
    canRunSimulation,
    chartPoints,
    dataQuality,
    defaultsError,
    defaultsLoading,
    overrides,
    resolvedParams,
    result,
    runSimulation,
    setOverrides,
    setTargetAmount,
    simulationError,
    simulationLoading,
    targetAmount,
    timelineMedian,
  } = useGoalSimulation();

  const targetAmountError =
    targetAmount == null || targetAmount <= 0
      ? 'Введите целевую сумму больше нуля.'
      : null;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8">
      <PageHeader title="Цели" className="mb-0" />

      <GoalTargetForm
        targetAmount={targetAmount}
        currencyCode={baseCurrencyCode}
        error={targetAmountError}
        onChange={setTargetAmount}
      />

      <GoalProjectionSummary
        targetAmount={targetAmount}
        currencyCode={baseCurrencyCode}
        loading={simulationLoading}
        error={simulationError}
        result={result}
        canRunSimulation={canRunSimulation}
        timelineMedian={timelineMedian}
        achievementRangeText={achievementRangeText}
        onRunSimulation={() => void runSimulation()}
      />

      {resolvedParams ? (
        <GoalParametersPanel
          resolvedParams={resolvedParams}
          overrides={overrides}
          onChange={setOverrides}
        />
      ) : defaultsLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-11 max-w-xl rounded-xl" />
          <Skeleton className="h-[260px] rounded-2xl" />
        </div>
      ) : defaultsError ? (
        <div className="rounded-xl border border-[var(--ft-warning-500)]/30 bg-[var(--ft-warning-500)]/10 px-4 py-3 text-sm">
          <div className="font-medium text-foreground">{defaultsError}</div>
          <div className="mt-1 text-muted-foreground">
            Параметры появятся после успешной симуляции или после повторной загрузки ориентиров.
          </div>
        </div>
      ) : null}

      <GoalFanChartCard
        loading={simulationLoading}
        points={chartPoints}
        currencyCode={baseCurrencyCode}
        targetAmount={Math.max(0, targetAmount ?? 0)}
      />

      {dataQuality ? <GoalDataQualityCard quality={dataQuality} /> : null}
    </div>
  );
}
