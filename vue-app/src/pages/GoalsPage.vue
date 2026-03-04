<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import GoalDetailPanel from '@/features/goals/components/GoalDetailPanel.vue'
import GoalEmptyState from '@/features/goals/components/GoalEmptyState.vue'
import { useGoals } from '@/features/goals/composables/useGoals.ts'

const {
  goals,
  state,
  error,
  selectedGoal,
  selectedGoalId,
  loadGoals,
  createGoal,
  deleteGoal,
  selectGoal,
} = useGoals()

const showCreateDialog = ref(false)
const creating = ref(false)
const formError = ref<string | null>(null)

const newGoalName = ref('')
const newGoalAmount = ref<number | null>(1_000_000)
const newGoalCurrency = ref('RUB')

const currencies = [
  { label: 'RUB ₽', value: 'RUB' },
  { label: 'USD $', value: 'USD' },
  { label: 'EUR €', value: 'EUR' },
]

const goalOptions = computed(() =>
  goals.value.map(g => ({
    label: `${g.name} — ${new Intl.NumberFormat('ru-RU', { style: 'currency', currency: g.currencyCode, maximumFractionDigits: 0 }).format(g.targetAmount)}`,
    value: g.id,
  })),
)

const isLoading = computed(() => state.value === 'idle' || state.value === 'loading')
const isError = computed(() => state.value === 'error')
const isEmpty = computed(() => state.value === 'empty')

function openCreateDialog() {
  newGoalName.value = ''
  newGoalAmount.value = 1_000_000
  newGoalCurrency.value = 'RUB'
  formError.value = null
  showCreateDialog.value = true
}

async function submitCreate() {
  if (!newGoalName.value.trim() || !newGoalAmount.value || newGoalAmount.value <= 0)
    return

  creating.value = true
  formError.value = null

  try {
    await createGoal({
      name: newGoalName.value.trim(),
      targetAmount: newGoalAmount.value,
      currencyCode: newGoalCurrency.value,
    })

    showCreateDialog.value = false
  }
  catch {
    formError.value = 'Не удалось создать цель. Попробуйте ещё раз.'
  }
  finally {
    creating.value = false
  }
}

async function handleDeleteGoal() {
  if (!selectedGoalId.value)
    return

  const goal = goals.value.find(item => item.id === selectedGoalId.value)
  const name = goal?.name ?? 'эту цель'

  const isConfirmed = window.confirm(`Удалить цель «${name}»?`)
  if (!isConfirmed)
    return

  try {
    await deleteGoal(selectedGoalId.value)
  }
  catch {
    // error reflected in composable state
  }
}

onMounted(() => {
  void loadGoals()
})
</script>

<template>
  <PageContainer>
    <PageHeader title="Цели">
      <template #actions>
        <button
          type="button"
          class="goals-btn goals-btn--primary"
          @click="openCreateDialog"
        >
          + Новая цель
        </button>
      </template>
    </PageHeader>

    <div
      v-if="isLoading"
      class="goals-loading"
    >
      <Skeleton height="40px" border-radius="6px" />
      <Skeleton height="400px" border-radius="6px" />
    </div>

    <div
      v-else-if="isError"
      class="goals-error"
    >
      <Message severity="error">
        {{ error || 'Не удалось загрузить цели.' }}
      </Message>
      <button
        type="button"
        class="goals-btn goals-btn--secondary"
        @click="loadGoals"
      >
        Повторить
      </button>
    </div>

    <div
      v-else-if="isEmpty"
      class="goals-empty"
    >
      <GoalEmptyState @create="openCreateDialog" />
    </div>

    <template v-else>
      <div class="goals-toolbar">
        <Select
          :model-value="selectedGoalId"
          :options="goalOptions"
          option-label="label"
          option-value="value"
          placeholder="Выберите цель"
          class="goals-select"
          @update:model-value="selectGoal"
        />
        <button
          v-if="selectedGoalId"
          type="button"
          class="goals-btn goals-btn--ghost goals-btn--delete"
          :title="`Удалить цель`"
          @click="handleDeleteGoal"
        >
          <i class="pi pi-trash" />
        </button>
      </div>

      <GoalDetailPanel
        v-if="selectedGoal"
        :goal="selectedGoal"
      />
    </template>

    <Dialog
      v-model:visible="showCreateDialog"
      header="Новая цель"
      :modal="true"
      :style="{ width: '420px' }"
    >
      <div class="goals-form">
        <Message
          v-if="formError"
          severity="error"
        >
          {{ formError }}
        </Message>

        <div class="form-field">
          <label for="goal-name">Название</label>
          <InputText
            id="goal-name"
            v-model="newGoalName"
            placeholder="Например: Капитал 10 млн"
            fluid
          />
        </div>

        <div class="form-field">
          <label for="goal-amount">Целевая сумма</label>
          <InputNumber
            id="goal-amount"
            v-model="newGoalAmount"
            :min="1"
            locale="ru-RU"
            fluid
          />
        </div>

        <div class="form-field">
          <label for="goal-currency">Валюта</label>
          <Select
            id="goal-currency"
            v-model="newGoalCurrency"
            :options="currencies"
            option-label="label"
            option-value="value"
            fluid
          />
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          class="goals-btn goals-btn--secondary"
          @click="showCreateDialog = false"
        >
          Отмена
        </button>
        <button
          type="button"
          class="goals-btn goals-btn--primary"
          :disabled="creating || !newGoalName.trim()"
          @click="submitCreate"
        >
          {{ creating ? 'Создаю...' : 'Создать' }}
        </button>
      </template>
    </Dialog>
  </PageContainer>
</template>

<style scoped>
.goals-loading {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.goals-error {
  display: grid;
  gap: var(--ft-space-4);
  max-width: 480px;
}

.goals-empty {
  min-height: 420px;
}

.goals-toolbar {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  margin-bottom: var(--ft-space-6);
}

.goals-select {
  flex: 1;
  max-width: 420px;
}

.goals-btn {
  cursor: pointer;

  padding: var(--ft-space-2) var(--ft-space-5);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);

  border: none;
  border-radius: var(--ft-radius-md);
}

.goals-btn--primary {
  color: var(--ft-text-inverse);
  background: var(--ft-primary-400);
}

.goals-btn--primary:hover {
  background: var(--ft-primary-300);
}

.goals-btn--primary:disabled {
  cursor: default;
  opacity: 0.6;
}

.goals-btn--secondary {
  color: var(--ft-text-primary);
  background: var(--ft-surface-elevated);
}

.goals-btn--ghost {
  padding: var(--ft-space-2);
  color: var(--ft-text-muted);
  background: none;
}

.goals-btn--delete:hover {
  color: var(--ft-danger-500);
}

.goals-btn:focus-visible {
  outline: 2px solid var(--ft-primary-400);
  outline-offset: 2px;
}

.goals-form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding: var(--ft-space-4) 0;
}

.form-field {
  display: grid;
  gap: var(--ft-space-2);
}

.form-field label {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}
</style>
