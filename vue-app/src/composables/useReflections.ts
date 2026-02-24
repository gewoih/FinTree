import axios from 'axios'
import { ref } from 'vue'
import { apiService } from '@/services/api.service'
import type {
  AnalyticsDashboardDto,
  RetrospectiveDto,
  RetrospectiveListItemDto,
  UpsertRetrospectivePayload,
} from '@/types'
import type { ViewState } from '@/types/view-state'

function resolveApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseMessage = (error.response?.data as { error?: string } | undefined)?.error
    const enrichedMessage = (error as AxiosLikeError).userMessage

    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage
    }

    if (typeof enrichedMessage === 'string' && enrichedMessage.trim()) {
      return enrichedMessage
    }
  }

  return error instanceof Error ? error.message : fallback
}

type AxiosLikeError = {
  userMessage?: string
}

export function useReflections() {
  const list = ref<RetrospectiveListItemDto[]>([])
  const listState = ref<ViewState>('idle')
  const listError = ref<string | null>(null)
  const availableMonths = ref<string[]>([])
  const availableMonthsState = ref<ViewState>('idle')
  const availableMonthsError = ref<string | null>(null)

  async function loadList() {
    listState.value = 'loading'
    listError.value = null

    try {
      list.value = await apiService.getRetrospectives()
      listState.value = list.value.length > 0 ? 'success' : 'empty'
    } catch (error: unknown) {
      listError.value = resolveApiError(error, 'Ошибка загрузки данных')
      listState.value = 'error'
    }
  }

  async function deleteRetro(month: string) {
    await apiService.deleteRetrospective(month)
    list.value = list.value.filter(retro => retro.month !== month)
    if (list.value.length === 0 && listState.value === 'success') {
      listState.value = 'empty'
    }
  }

  async function loadAvailableMonths(force = false) {
    if (availableMonthsState.value === 'loading') {
      return
    }

    if (!force && (availableMonthsState.value === 'success' || availableMonthsState.value === 'empty')) {
      return
    }

    availableMonthsState.value = 'loading'
    availableMonthsError.value = null

    try {
      availableMonths.value = await apiService.getRetrospectiveAvailableMonths()
      availableMonthsState.value = availableMonths.value.length > 0 ? 'success' : 'empty'
    } catch (error: unknown) {
      availableMonthsError.value = resolveApiError(error, 'Ошибка загрузки месяцев')
      availableMonthsState.value = 'error'
    }
  }

  return {
    list,
    listState,
    listError,
    availableMonths,
    availableMonthsState,
    availableMonthsError,
    loadList,
    loadAvailableMonths,
    deleteRetro,
  }
}

export function useRetrospectiveDetail(initialMonth: string) {
  const month = ref(initialMonth)
  const data = ref<RetrospectiveDto | null>(null)
  const state = ref<ViewState>('idle')
  const error = ref<string | null>(null)
  const saving = ref(false)

  function setMonth(value: string) {
    month.value = value
  }

  async function load() {
    if (!month.value) {
      data.value = null
      state.value = 'idle'
      return
    }

    state.value = 'loading'
    error.value = null

    try {
      data.value = await apiService.getRetrospective(month.value)
      state.value = 'success'
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 404) {
        data.value = null
        state.value = 'empty'
        return
      }

      error.value = resolveApiError(requestError, 'Ошибка загрузки данных')
      state.value = 'error'
    }
  }

  async function save(payload: UpsertRetrospectivePayload) {
    saving.value = true
    error.value = null

    try {
      data.value = await apiService.upsertRetrospective(payload)
      state.value = 'success'
    } catch (saveError: unknown) {
      error.value = resolveApiError(saveError, 'Ошибка сохранения')
      state.value = 'error'
      throw saveError
    } finally {
      saving.value = false
    }
  }

  async function loadSummary(summaryMonth: string): Promise<AnalyticsDashboardDto> {
    const [yearRaw, monthRaw] = summaryMonth.split('-')
    const year = Number(yearRaw)
    const monthValue = Number(monthRaw)

    if (!Number.isFinite(year) || !Number.isFinite(monthValue)) {
      throw new Error('Некорректный месяц для загрузки сводки')
    }

    return apiService.getAnalyticsDashboard(year, monthValue)
  }

  return {
    month,
    data,
    state,
    error,
    saving,
    setMonth,
    load,
    save,
    loadSummary,
  }
}
