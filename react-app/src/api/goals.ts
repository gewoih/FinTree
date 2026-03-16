import { apiClient } from './index';
import type {
  GoalSimulationParametersDto,
  GoalSimulationRequestDto,
  GoalSimulationResultDto,
} from '@/types';

export async function getGoalSimulationDefaults(): Promise<GoalSimulationParametersDto> {
  const res = await apiClient.get<GoalSimulationParametersDto>(
    '/goals/simulation-defaults'
  );
  return res.data;
}

export async function simulateGoal(
  request: GoalSimulationRequestDto
): Promise<GoalSimulationResultDto> {
  const res = await apiClient.post<GoalSimulationResultDto>(
    '/goals/simulate',
    request
  );
  return res.data;
}
