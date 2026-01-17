<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CategoryManager from '../components/CategoryManager.vue'
import { useFinanceStore } from '../stores/finance'

const financeStore = useFinanceStore()
const managerRef = ref<InstanceType<typeof CategoryManager> | null>(null)

onMounted(() => {
  financeStore.fetchCategories()
})
</script>

<template>
  <PageContainer>
    <PageHeader
      title="Категории"
      description="Настройте группировки для расходов и доходов, чтобы аналитика была точнее"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
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

    <UiSection gap="lg">
      <CategoryManager ref="managerRef" />
    </UiSection>
  </PageContainer>
</template>
