import { PageHeader } from '@/components/common/PageHeader';
import { useCurrentUser } from '@/features/auth/session';
import { GoalProjectionSummary } from '@/features/goals/GoalProjectionSummary';
import { GoalTargetForm } from '@/features/goals/GoalTargetForm';
import { useGoalSimulation } from '@/features/goals/useGoalSimulation';

export default function GoalsPage() {
  const currentUser = useCurrentUser();
  const baseCurrencyCode = currentUser?.baseCurrencyCode ?? 'RUB';
  const {
    achievementRangeText,
    canRunSimulation,
    chartPoints,
    dataQuality,
    defaultsError,
    defaultsLoading,
    hasPendingChanges,
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
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:px-8">
      <PageHeader
        title="Цели"
        subtitle="Задайте сценарий, пересчитайте прогноз и сразу оцените диапазон достижения на графике."
        className="mb-0"
      />

      <GoalTargetForm
        targetAmount={targetAmount}
        currencyCode={baseCurrencyCode}
        error={targetAmountError}
        resolvedParams={resolvedParams}
        overrides={overrides}
        defaultsLoading={defaultsLoading}
        defaultsError={defaultsError}
        canRunSimulation={canRunSimulation}
        simulationLoading={simulationLoading}
        hasPendingChanges={hasPendingChanges}
        hasResult={result != null}
        onChange={setTargetAmount}
        onOverrideChange={setOverrides}
        onRunSimulation={() => void runSimulation()}
      />

      <GoalProjectionSummary
        targetAmount={targetAmount}
        currencyCode={baseCurrencyCode}
        loading={simulationLoading}
        error={simulationError}
        result={result}
        timelineMedian={timelineMedian}
        achievementRangeText={achievementRangeText}
        points={chartPoints}
        dataQuality={dataQuality}
        hasPendingChanges={hasPendingChanges}
      />
    </div>
  );
}
