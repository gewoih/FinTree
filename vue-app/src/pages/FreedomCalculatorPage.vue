<script setup lang="ts">
import { onMounted, watch } from 'vue'
import Message from 'primevue/message'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FreedomParametersPanel from '@/features/freedom-calculator/components/FreedomParametersPanel.vue'
import FreedomHeroBlock from '@/features/freedom-calculator/components/FreedomHeroBlock.vue'
import FreedomCalendarHeatmap from '@/features/freedom-calculator/components/FreedomCalendarHeatmap.vue'
import { useFreedomCalculator } from '@/features/freedom-calculator/composables/useFreedomCalculator.ts'

const {
  defaults,
  result,
  loading,
  defaultsLoading,
  defaultsError,
  localParams,
  loadDefaults,
  calculate,
  calculateDebounced,
} = useFreedomCalculator()

onMounted(async () => {
  await loadDefaults()
  void calculate({ ...localParams })
})

watch(
  localParams,
  (params) => {
    calculateDebounced({ ...params })
  },
  { deep: true },
)
</script>

<template>
  <PageContainer>
    <PageHeader title="Калькулятор свободы" />

    <Message
      v-if="defaultsError && !defaultsLoading"
      severity="warn"
      class="freedom-page__warn"
    >
      {{ defaultsError }}
    </Message>

    <div class="freedom-layout">
      <div class="ft-card">
        <FreedomHeroBlock
          :result="result"
          :loading="loading || defaultsLoading"
        />
      </div>

      <div class="freedom-layout__bottom">
        <section>
          <div class="ft-card">
            <FreedomParametersPanel
              :model-value="localParams"
              :defaults="defaults"
              @update:model-value="(v) => Object.assign(localParams, v)"
            />
          </div>
        </section>

        <section>
          <div class="ft-card">
            <FreedomCalendarHeatmap :free-days-per-year="result?.freeDaysPerYear ?? 0" />
          </div>
        </section>
      </div>
    </div>
  </PageContainer>
</template>

<style scoped>
.freedom-page__warn {
  margin-bottom: var(--ft-space-4);
}

.freedom-layout {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.freedom-layout__bottom {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: var(--ft-space-4);
  align-items: start;
}

@media (width <= 1024px) {
  .freedom-layout__bottom {
    grid-template-columns: 1fr;
  }
}
</style>
