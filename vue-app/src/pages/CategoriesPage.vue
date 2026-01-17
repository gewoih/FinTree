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
  <div class="categories page">
    <PageHeader
      title="Категории"
      subtitle="Настройте группировки для расходов и доходов, чтобы аналитика была точнее"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Категории' }
      ]"
    >
      <template #actions>
        <AppButton
          label="Новая категория"
          icon="pi pi-plus"
          @click="managerRef?.openModal()"
        />
      </template>
    </PageHeader>

    <section class="page-section categories__content">
      <CategoryManager ref="managerRef" />
    </section>
  </div>
</template>

<style scoped>
.categories {
  gap: var(--ft-layout-section-gap);
}

.categories__content {
  gap: var(--ft-layout-card-gap);
}
</style>
