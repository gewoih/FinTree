import type { StabilityActionCode, StabilityStatusCode } from '@/types'

type HealthAccent = StabilityStatusCode | 'neutral'

const STABILITY_STATUS_LABELS: Record<StabilityStatusCode, string> = {
  good: 'Хорошая стабильность',
  average: 'Есть скачки',
  poor: 'Нужна стабилизация',
}

const STABILITY_ACTION_TEXTS: Record<StabilityActionCode, string> = {
  keep_routine: 'Расходы стабильны. Продолжайте сохранять текущий ритм.',
  smooth_spikes: 'Редкие всплески расходов. Старайтесь контролировать ваши траты.',
  cap_impulse_spend: 'Расходы хаотичны. Уделите особое внимание импульсивным тратам.',
}

function isStabilityStatusCode(value: string | null | undefined): value is StabilityStatusCode {
  return value === 'good' || value === 'average' || value === 'poor'
}

function isStabilityActionCode(value: string | null | undefined): value is StabilityActionCode {
  return value === 'keep_routine' || value === 'smooth_spikes' || value === 'cap_impulse_spend'
}

export function resolveStabilityAccent(status: string | null | undefined): HealthAccent {
  if (!isStabilityStatusCode(status)) return 'neutral'
  return status
}

export function resolveStabilityStatusLabel(status: string | null | undefined): string {
  if (!isStabilityStatusCode(status)) return 'Без оценки'
  return STABILITY_STATUS_LABELS[status]
}

export function resolveStabilityActionText(actionCode: string | null | undefined): string {
  if (!isStabilityActionCode(actionCode)) {
    return 'Добавляйте расходы регулярно, чтобы получить подсказку.'
  }

  return STABILITY_ACTION_TEXTS[actionCode]
}
