<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  freeDaysPerYear: number
}>()

const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

type CellType = 'empty' | 'free' | 'work'

interface DayCell {
  type: CellType
  day: number
}

interface CalendarMonth {
  name: string
  cells: DayCell[]
}

const calendarMonths = computed<CalendarMonth[]>(() => {
  let remainingFreeDays = Math.min(365, Math.max(0, Math.floor(props.freeDaysPerYear)))
  const year = new Date().getFullYear()

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

    const cells: DayCell[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      if (remainingFreeDays > 0) {
        cells.push({ type: 'free', day })
        remainingFreeDays--
      }
      else {
        cells.push({ type: 'work', day })
      }
    }

    return { name: MONTH_NAMES[monthIndex], cells }
  })
})

const ariaLabel = computed(() => {
  const year = new Date().getFullYear()
  return `Календарь свободы: ${props.freeDaysPerYear} свободных дней в ${year} году`
})
</script>

<template>
  <div class="calendar-heatmap">
    <div class="calendar-heatmap__header">
      <span class="calendar-heatmap__title">Календарь свободы</span>
    </div>

    <div
      class="calendar-heatmap__grid"
      role="img"
      :aria-label="ariaLabel"
    >
      <div
        v-for="month in calendarMonths"
        :key="month.name"
        class="calendar-heatmap__month"
      >
        <div class="calendar-heatmap__month-name">
          {{ month.name }}
        </div>
        <div class="calendar-heatmap__month-grid">
          <div
            v-for="(cell, i) in month.cells"
            :key="`cell-${i}`"
            class="calendar-heatmap__cell"
            :class="{
              'calendar-heatmap__cell--free': cell.type === 'free',
              'calendar-heatmap__cell--work': cell.type === 'work',
              'calendar-heatmap__cell--empty': cell.type === 'empty',
            }"
            :title="cell.day > 0 ? String(cell.day) : undefined"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>

    <div class="calendar-heatmap__legend">
      <span class="calendar-heatmap__legend-item">
        <span class="calendar-heatmap__legend-dot calendar-heatmap__legend-dot--free" />
        Дни свободы
      </span>
      <span class="calendar-heatmap__legend-item">
        <span class="calendar-heatmap__legend-dot calendar-heatmap__legend-dot--work" />
        Нужно работать
      </span>
    </div>
  </div>
</template>

<style scoped>
.calendar-heatmap {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding: var(--ft-space-4);
}

.calendar-heatmap__header {
  display: flex;
  align-items: center;
}

.calendar-heatmap__title {
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.calendar-heatmap__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--ft-space-4);
}

.calendar-heatmap__month {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
}

.calendar-heatmap__month-name {
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.calendar-heatmap__month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-heatmap__cell {
  aspect-ratio: 1 / 1;
  min-width: 0;
  border-radius: var(--ft-radius-sm);
}

.calendar-heatmap__cell--free {
  opacity: 0.85;
  background: var(--ft-success-500);
}

.calendar-heatmap__cell--work {
  background: var(--ft-border-default);
}

.calendar-heatmap__cell--empty {
  background: transparent;
}

.calendar-heatmap__legend {
  display: flex;
  gap: var(--ft-space-4);
  justify-content: flex-end;
}

.calendar-heatmap__legend-item {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.calendar-heatmap__legend-dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: var(--ft-radius-sm);
}

.calendar-heatmap__legend-dot--free {
  opacity: 0.85;
  background: var(--ft-success-500);
}

.calendar-heatmap__legend-dot--work {
  background: var(--ft-border-default);
}

@media (width <= 640px) {
  .calendar-heatmap__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 360px) {
  .calendar-heatmap__grid {
    grid-template-columns: 1fr;
  }
}
</style>
