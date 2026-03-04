import { computed, ref } from 'vue'
import { apiService } from '@/services/api.service.ts'
import type { CreateGoalPayload, GoalDto, UpdateGoalPayload } from '@/types.ts'
import type { ViewState } from '@/types/view-state.ts'

export function useGoals() {
  const goals = ref<GoalDto[]>([])
  const state = ref<ViewState>('idle')
  const error = ref<string | null>(null)
  const selectedGoalId = ref<string | null>(null)

  const selectedGoal = computed(() =>
    goals.value.find(goal => goal.id === selectedGoalId.value) ?? null,
  )

  async function loadGoals() {
    state.value = 'loading'
    error.value = null

    try {
      goals.value = await apiService.getGoals()
      state.value = goals.value.length > 0 ? 'success' : 'empty'

      if (goals.value.length > 0) {
        const hasSelectedGoal = goals.value.some(goal => goal.id === selectedGoalId.value)
        const firstGoalId = goals.value[0]?.id ?? null
        selectedGoalId.value = hasSelectedGoal ? selectedGoalId.value : firstGoalId
      } else {
        selectedGoalId.value = null
      }
    } catch {
      error.value = 'Не удалось загрузить цели.'
      state.value = 'error'
    }
  }

  async function createGoal(payload: CreateGoalPayload): Promise<GoalDto> {
    error.value = null

    try {
      const goal = await apiService.createGoal(payload)
      goals.value = [...goals.value, goal]
      selectedGoalId.value = goal.id
      state.value = 'success'
      return goal
    } catch {
      error.value = 'Не удалось создать цель.'
      throw new Error(error.value)
    }
  }

  async function updateGoal(id: string, payload: UpdateGoalPayload): Promise<GoalDto> {
    error.value = null

    try {
      const updatedGoal = await apiService.updateGoal(id, payload)
      goals.value = goals.value.map(goal => (goal.id === id ? updatedGoal : goal))
      return updatedGoal
    } catch {
      error.value = 'Не удалось обновить цель.'
      throw new Error(error.value)
    }
  }

  async function deleteGoal(id: string): Promise<void> {
    error.value = null

    try {
      await apiService.deleteGoal(id)
      goals.value = goals.value.filter(goal => goal.id !== id)

      if (selectedGoalId.value === id)
        selectedGoalId.value = goals.value[0]?.id ?? null

      state.value = goals.value.length > 0 ? 'success' : 'empty'
    } catch {
      error.value = 'Не удалось удалить цель.'
      throw new Error(error.value)
    }
  }

  function selectGoal(id: string) {
    selectedGoalId.value = id
  }

  return {
    goals,
    state,
    error,
    selectedGoalId,
    selectedGoal,
    loadGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    selectGoal,
  }
}
