<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import InputNumber from 'primevue/inputnumber'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import GoalDetailPanel from '@/features/goals/components/GoalDetailPanel.vue'
import { useUserStore } from '@/stores/user.ts'

const userStore = useUserStore()

const targetAmount = ref<number | null>(5_000_000)

const isUserLoading = computed(() => userStore.isLoading && !userStore.baseCurrencyCode)
const baseCurrencyCode = computed(() => userStore.baseCurrencyCode ?? 'RUB')
const hasValidTarget = computed(() => (targetAmount.value ?? 0) > 0)

onMounted(() => {
  void userStore.fetchCurrentUser()
})
</script>

<template>
  <PageContainer>
    <PageHeader title="Цели" />

    <div
      v-if="isUserLoading"
      class="goals-loading"
    >
      <Skeleton
        height="40px"
        border-radius="6px"
      />
      <Skeleton
        height="420px"
        border-radius="6px"
      />
    </div>

    <div v-else>
      <div class="goals-target-panel">
        <label
          for="goal-target-amount"
          class="goals-target-panel__label"
        >
          Целевая сумма ({{ baseCurrencyCode }})
        </label>
        <InputNumber
          id="goal-target-amount"
          v-model="targetAmount"
          :min="1"
          locale="ru-RU"
          fluid
          class="goals-target-panel__input"
        />
      </div>

      <Message
        v-if="!hasValidTarget"
        severity="warn"
      >
        Введите целевую сумму больше нуля.
      </Message>

      <GoalDetailPanel
        :target-amount="targetAmount ?? 0"
        :currency-code="baseCurrencyCode"
      />
    </div>
  </PageContainer>
</template>

<style scoped>
.goals-loading {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.goals-target-panel {
  display: grid;
  gap: var(--ft-space-2);

  max-width: 420px;
  margin-bottom: var(--ft-space-6);
}

.goals-target-panel__label {
  margin: 0;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
}

.goals-target-panel__input {
  width: 100%;
}
</style>
