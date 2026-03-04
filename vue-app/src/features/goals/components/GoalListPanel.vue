<script setup lang="ts">
import type { GoalDto } from '@/types.ts'

const props = defineProps<{
  goals: GoalDto[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  create: []
  delete: [id: string]
}>()

function formatAmount(goal: GoalDto): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: goal.currencyCode,
    maximumFractionDigits: 0,
  }).format(goal.targetAmount)
}

function handleDelete(event: MouseEvent, id: string) {
  event.stopPropagation()
  emit('delete', id)
}
</script>

<template>
  <div class="goal-list">
    <div class="goal-list__header">
      <span class="goal-list__title">Цели</span>

      <button
        type="button"
        class="create-btn"
        aria-label="Создать новую цель"
        @click="emit('create')"
      >
        <i class="pi pi-plus" />
      </button>
    </div>

    <div class="goal-list__items">
      <div
        v-for="goal in props.goals"
        :key="goal.id"
        class="goal-item"
        :class="{ 'goal-item--active': goal.id === props.selectedId }"
      >
        <button
          type="button"
          class="goal-item__select"
          :aria-label="`Открыть цель ${goal.name}`"
          @click="emit('select', goal.id)"
        >
          <div class="goal-item__name">
            {{ goal.name }}
          </div>
          <div class="goal-item__meta">
            {{ formatAmount(goal) }}
          </div>
        </button>

        <button
          type="button"
          class="goal-item__delete"
          :aria-label="`Удалить цель ${goal.name}`"
          @click="(event) => handleDelete(event, goal.id)"
        >
          <i class="pi pi-trash" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.goal-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid var(--ft-border-subtle);
}

.goal-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-4);

  border-bottom: 1px solid var(--ft-border-subtle);
}

.goal-list__title {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.create-btn {
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 36px;
  height: 36px;

  font-size: var(--ft-text-base);
  color: var(--ft-primary-400);

  background: none;
  border: none;
  border-radius: var(--ft-radius-sm);
}

.create-btn:hover {
  color: var(--ft-primary-300);
  background: color-mix(in srgb, var(--ft-primary-400) 10%, transparent);
}

.create-btn:focus-visible {
  outline: 2px solid var(--ft-primary-300);
  outline-offset: 2px;
}

.goal-list__items {
  overflow-y: auto;
  flex: 1;
  padding: var(--ft-space-2) 0;
}

.goal-item {
  display: flex;
  gap: var(--ft-space-2);
  align-items: stretch;

  border-left: 2px solid transparent;

  transition: border-color var(--ft-transition-fast), background var(--ft-transition-fast);
}

.goal-item__select {
  cursor: pointer;

  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--ft-space-1);
  align-items: flex-start;
  justify-content: center;

  width: 100%;
  padding: var(--ft-space-3) var(--ft-space-4);

  text-align: left;

  background: none;
  border: none;

  transition: background var(--ft-transition-fast);
}

.goal-item__select:hover {
  background: var(--ft-surface-raised);
}

.goal-item--active {
  border-left-color: var(--ft-primary-400);
}

.goal-item--active .goal-item__select {
  background: color-mix(in srgb, var(--ft-primary-400) 8%, transparent);
}

.goal-item__name {
  overflow: hidden;

  min-width: 0;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-item__meta {
  font-size: var(--ft-text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--ft-text-secondary);
}

.goal-item__delete {
  cursor: pointer;

  width: 32px;
  height: 32px;

  color: var(--ft-text-tertiary);

  background: none;
  border: none;
  border-radius: var(--ft-radius-sm);
}

.goal-item__select:focus-visible,
.goal-item__delete:focus-visible {
  outline: 2px solid var(--ft-primary-300);
  outline-offset: 1px;
}

.goal-item__delete:hover {
  color: var(--ft-danger-500);
  background: color-mix(in srgb, var(--ft-danger-500) 10%, transparent);
}
</style>
