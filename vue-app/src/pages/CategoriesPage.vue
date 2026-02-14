<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CategoryManager from '../components/CategoryManager.vue'
import { useFinanceStore } from '../stores/finance'
import PageContainer from '../components/layout/PageContainer.vue'
import PageHeader from '../components/common/PageHeader.vue'
import UiSection from '../ui/UiSection.vue'

const financeStore = useFinanceStore()
const managerRef = ref<InstanceType<typeof CategoryManager> | null>(null)

onMounted(() => {
  financeStore.fetchCategories()
})
</script>

<template>
  <PageContainer class="categories">
    <PageHeader
      title="Категории"
      subtitle="Настройте группировки для расходов и доходов, чтобы аналитика была точнее"
      :breadcrumbs="[
        { label: 'Главная', to: '/analytics' },
        { label: 'Категории' }
      ]"
    >
      <template #actions>
        <UiButton
          label="Новая категория"
          icon="pi pi-plus"
          @click="managerRef?.openModal()"
        />
      </template>
    </PageHeader>

    <UiSection class="categories__content">
      <CategoryManager ref="managerRef" />
    </UiSection>
  </PageContainer>
</template>

<style scoped>
.categories {
  gap: var(--ft-space-8);
}

.categories__content {
  gap: var(--ft-space-6);
}
</style>
