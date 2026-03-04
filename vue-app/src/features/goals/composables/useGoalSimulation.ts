import { ref } from 'vue'
import { apiService } from '@/services/api.service.ts'
import type { GoalSimulationRequestDto, GoalSimulationResultDto } from '@/types.ts'

export function useGoalSimulation() {
  const result = ref<GoalSimulationResultDto | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0

  const clearDebounce = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  async function simulate(goalId: string, request: GoalSimulationRequestDto) {
    loading.value = true
    error.value = null
    const currentRequestId = ++requestId

    try {
      const data = await apiService.simulateGoal(goalId, request)
      if (currentRequestId !== requestId)
        return

      result.value = data
    } catch {
      if (currentRequestId !== requestId)
        return

      error.value = 'Не удалось запустить симуляцию.'
      result.value = null
    } finally {
      if (currentRequestId === requestId)
        loading.value = false
    }
  }

  function simulateDebounced(goalId: string, request: GoalSimulationRequestDto, delayMs = 500) {
    clearDebounce()
    loading.value = true
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void simulate(goalId, request)
    }, delayMs)
  }

  function reset() {
    requestId += 1
    clearDebounce()
    result.value = null
    error.value = null
    loading.value = false
  }

  return {
    result,
    loading,
    error,
    simulate,
    simulateDebounced,
    reset,
  }
}
