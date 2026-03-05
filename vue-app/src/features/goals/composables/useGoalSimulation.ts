import { ref } from 'vue'
import { apiService } from '@/services/api.service.ts'
import type { GoalSimulationRequestDto, GoalSimulationResultDto } from '@/types.ts'

function normalizeRequest(request: GoalSimulationRequestDto): GoalSimulationRequestDto {
  return {
    targetAmount: request.targetAmount,
    initialCapital: request.initialCapital ?? null,
    monthlyIncome: request.monthlyIncome ?? null,
    monthlyExpenses: request.monthlyExpenses ?? null,
    annualReturnRate: request.annualReturnRate ?? null,
  }
}

function getRequestKey(request: GoalSimulationRequestDto): string {
  return JSON.stringify(normalizeRequest(request))
}

export function useGoalSimulation() {
  const result = ref<GoalSimulationResultDto | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0
  let lastQueuedRequestKey: string | null = null
  let lastCompletedRequestKey: string | null = null

  const clearDebounce = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  async function simulate(request: GoalSimulationRequestDto, requestKey?: string) {
    const normalized = normalizeRequest(request)
    const key = requestKey ?? getRequestKey(normalized)

    if (key === lastCompletedRequestKey) {
      loading.value = false
      return
    }

    loading.value = true
    error.value = null
    const currentRequestId = ++requestId

    try {
      const data = await apiService.simulateGoal(normalized)
      if (currentRequestId !== requestId)
        return

      result.value = data
      lastCompletedRequestKey = key
    }
    catch {
      if (currentRequestId !== requestId)
        return

      error.value = 'Не удалось запустить симуляцию.'
      result.value = null
    }
    finally {
      if (currentRequestId === requestId) {
        loading.value = false
        if (lastQueuedRequestKey === key)
          lastQueuedRequestKey = null
      }
    }
  }

  function simulateDebounced(request: GoalSimulationRequestDto, delayMs = 500) {
    const normalized = normalizeRequest(request)
    const requestKey = getRequestKey(normalized)

    if (requestKey === lastCompletedRequestKey || requestKey === lastQueuedRequestKey)
      return

    clearDebounce()
    lastQueuedRequestKey = requestKey
    loading.value = true

    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void simulate(normalized, requestKey)
    }, delayMs)
  }

  function reset() {
    requestId += 1
    clearDebounce()
    result.value = null
    error.value = null
    loading.value = false
    lastQueuedRequestKey = null
    lastCompletedRequestKey = null
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
