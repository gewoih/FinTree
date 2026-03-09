import { reactive, ref } from 'vue'
import { apiService } from '@/services/api.service.ts'
import type {
  FreedomCalculatorDefaultsDto,
  FreedomCalculatorRequestDto,
  FreedomCalculatorResultDto,
} from '@/types.ts'

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10
}

function normalizeRequest(params: FreedomCalculatorRequestDto): FreedomCalculatorRequestDto {
  return {
    capital: Math.max(0, roundCurrency(params.capital)),
    monthlyExpenses: Math.max(0, roundCurrency(params.monthlyExpenses)),
    swrPercent: roundPercent(params.swrPercent),
    inflationRatePercent: roundPercent(params.inflationRatePercent),
    inflationEnabled: params.inflationEnabled,
  }
}

function getRequestKey(params: FreedomCalculatorRequestDto): string {
  return JSON.stringify(normalizeRequest(params))
}

export function useFreedomCalculator() {
  const defaults = ref<FreedomCalculatorDefaultsDto | null>(null)
  const result = ref<FreedomCalculatorResultDto | null>(null)
  const loading = ref(false)
  const defaultsLoading = ref(false)
  const defaultsError = ref<string | null>(null)
  const error = ref<string | null>(null)

  const localParams = reactive<FreedomCalculatorRequestDto>({
    capital: 0,
    monthlyExpenses: 0,
    swrPercent: 4.0,
    inflationRatePercent: 5.0,
    inflationEnabled: true,
  })

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0
  let lastQueuedRequestKey: string | null = null
  let lastCompletedRequestKey: string | null = null
  let inFlightRequestKey: string | null = null

  const clearDebounce = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  async function loadDefaults() {
    defaultsLoading.value = true
    defaultsError.value = null
    try {
      const data = await apiService.getFreedomCalculatorDefaults()
      defaults.value = data
      localParams.capital = data.capital
      localParams.monthlyExpenses = data.monthlyExpenses
    }
    catch {
      defaultsError.value = 'Не удалось загрузить данные. Введите значения вручную.'
    }
    finally {
      defaultsLoading.value = false
    }
  }

  async function calculate(params: FreedomCalculatorRequestDto, requestKey?: string) {
    const normalized = normalizeRequest(params)
    const key = requestKey ?? getRequestKey(normalized)

    if (key === lastCompletedRequestKey || key === inFlightRequestKey) {
      loading.value = false
      return
    }

    loading.value = true
    error.value = null
    inFlightRequestKey = key
    const currentRequestId = ++requestId

    try {
      const data = await apiService.calculateFreedom(normalized)
      if (currentRequestId !== requestId)
        return

      result.value = data
      lastCompletedRequestKey = key
    }
    catch {
      if (currentRequestId !== requestId)
        return

      error.value = 'Не удалось выполнить расчёт.'
      result.value = null
    }
    finally {
      if (currentRequestId === requestId) {
        loading.value = false
        if (inFlightRequestKey === key)
          inFlightRequestKey = null

        if (lastQueuedRequestKey === key)
          lastQueuedRequestKey = null
      }
    }
  }

  function calculateDebounced(params: FreedomCalculatorRequestDto, delayMs = 400) {
    const normalized = normalizeRequest(params)
    const requestKey = getRequestKey(normalized)

    if (requestKey === lastCompletedRequestKey || requestKey === lastQueuedRequestKey || requestKey === inFlightRequestKey)
      return

    clearDebounce()
    lastQueuedRequestKey = requestKey
    loading.value = true

    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void calculate(normalized, requestKey)
    }, delayMs)
  }

  function resetToDefaults() {
    if (defaults.value) {
      localParams.capital = defaults.value.capital
      localParams.monthlyExpenses = defaults.value.monthlyExpenses
    }
    lastCompletedRequestKey = null
  }

  return {
    defaults,
    result,
    loading,
    defaultsLoading,
    defaultsError,
    error,
    localParams,
    loadDefaults,
    calculate,
    calculateDebounced,
    resetToDefaults,
  }
}
