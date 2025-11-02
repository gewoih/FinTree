<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CategoryManager from '../components/CategoryManager.vue'
import { useFinanceStore } from '../stores/finance'

const financeStore = useFinanceStore()
const managerRef = ref<InstanceType<typeof CategoryManager> | null>(null)

const handleCreateCategory = () => {
  managerRef.value?.openModal()
}

onMounted(() => {
  financeStore.fetchCategories()
})
</script>

<template>
  <div class="categories page">
    <PageHeader
      title="Категории"
      subtitle="Настройте группировку транзакций для лучшей аналитики"
      :breadcrumbs="[
        { label: 'Главная', to: '/dashboard' },
        { label: 'Категории' }
      ]"
    >
      <template #actions>
        <Button
          label="Создать категорию"
          icon="pi pi-plus"
          @click="handleCreateCategory"
        />
      </template>
    </PageHeader>

    <section class="categories__content">
      <CategoryManager ref="managerRef" />
    </section>
  </div>
</template>

<style scoped>
.categories {
  gap: var(--ft-space-8);
}

.categories__content {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
}
</style>
