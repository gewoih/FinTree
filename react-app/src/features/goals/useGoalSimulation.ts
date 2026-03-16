import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as goalsApi from '@/api/goals';
import { queryKeys } from '@/api/queryKeys';
import { resolveApiErrorMessage } from '@/utils/errors';
import {
  areGoalOverridesEqual,
  buildGoalChartPoints,
  buildGoalDataQuality,
  buildGoalRequest,
  buildGoalAchievementRangeText,
  formatGoalDate,
  getGoalRequestKey,
} from './goalUtils';
import type { GoalParameterOverrides } from './goalModels';

const INITIAL_TARGET_AMOUNT = 5_000_000;

export function useGoalSimulation() {
  const [targetAmount, setTargetAmount] = useState<number | null>(INITIAL_TARGET_AMOUNT);
  const [overrides, setOverrides] = useState<GoalParameterOverrides>({});
  const [baselineRequestKey, setBaselineRequestKey] = useState<string>(() =>
    getGoalRequestKey(INITIAL_TARGET_AMOUNT, {})
  );

  const defaultsQuery = useQuery({
    queryKey: queryKeys.goals.all(),
    queryFn: goalsApi.getGoalSimulationDefaults,
    staleTime: 30_000,
  });

  const simulationMutation = useMutation({
    mutationFn: goalsApi.simulateGoal,
  });

  const currentRequestKey = useMemo(
    () => getGoalRequestKey(targetAmount, overrides),
    [overrides, targetAmount]
  );

  const resolvedParams =
    simulationMutation.data?.resolvedParameters ?? defaultsQuery.data ?? null;
  const hasPendingChanges = currentRequestKey !== baselineRequestKey;
  const canRunInitialSimulation =
    simulationMutation.data == null && !defaultsQuery.isLoading;
  const canRunSimulation =
    Number.isFinite(targetAmount) &&
    (targetAmount ?? 0) > 0 &&
    !simulationMutation.isPending &&
    (canRunInitialSimulation || hasPendingChanges);

  const defaultsError = defaultsQuery.error
    ? resolveApiErrorMessage(
        defaultsQuery.error,
        'Не удалось загрузить параметры по данным пользователя.'
      )
    : null;
  const simulationError = simulationMutation.error
    ? resolveApiErrorMessage(
        simulationMutation.error,
        'Не удалось запустить симуляцию.'
      )
    : null;

  async function runSimulation() {
    if (!canRunSimulation) {
      return;
    }

    const requestKey = currentRequestKey;
    await simulationMutation.mutateAsync(buildGoalRequest(targetAmount, overrides));
    setBaselineRequestKey(requestKey);
  }

  function updateOverrides(nextOverrides: GoalParameterOverrides) {
    if (areGoalOverridesEqual(overrides, nextOverrides)) {
      return;
    }

    setOverrides({ ...nextOverrides });
  }

  return {
    achievementRangeText: buildGoalAchievementRangeText(simulationMutation.data ?? null),
    canRunSimulation,
    currentRequestKey,
    dataQuality: buildGoalDataQuality(simulationMutation.data?.dataQualityScore),
    defaultsError,
    defaultsLoading: defaultsQuery.isLoading,
    hasPendingChanges,
    overrides,
    resolvedParams,
    result: simulationMutation.data ?? null,
    runSimulation,
    setOverrides: updateOverrides,
    setTargetAmount,
    simulationError,
    simulationLoading: simulationMutation.isPending,
    targetAmount,
    targetAmountLabel:
      targetAmount != null ? targetAmount : 0,
    timelineMedian:
      simulationMutation.data != null
        ? formatGoalDate(
            simulationMutation.data.medianMonths,
            simulationMutation.data.monthLabels
          )
        : '—',
    chartPoints: buildGoalChartPoints(
      simulationMutation.data ?? null,
      Math.max(0, targetAmount ?? 0)
    ),
  };
}
