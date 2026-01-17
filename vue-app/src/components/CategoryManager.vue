<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import SelectButton from 'primevue/selectbutton'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useFinanceStore } from '../stores/finance'
import CategoryFormModal from './CategoryFormModal.vue'
import type { Category, CategoryType } from '../types'
import { CATEGORY_TYPE } from '../types'

const financeStore = useFinanceStore()
const toast = useToast()
const confirm = useConfirm()

const modalVisible = ref(false)
const editingCategory = ref<Category | null>(null)
const pendingCategoryId = ref<string | null>(null)
const selectedCategoryType = ref<CategoryType>(CATEGORY_TYPE.Expense)

const categoryTypeOptions = [
  { label: 'Расходы', value: CATEGORY_TYPE.Expense },
  { label: 'Доходы', value: CATEGORY_TYPE.Income },
]

const categories = computed<Category[]>(() => financeStore.categories ?? [])
const loadingCategories = computed(() => financeStore.areCategoriesLoading)

const filteredCategories = computed(() =>
  categories.value.filter((category: Category) => category.type === selectedCategoryType.value)
)

const systemCategories = computed(() =>
  filteredCategories.value.filter((category: Category) => category.isSystem)
)
const userCategories = computed(() =>
  filteredCategories.value.filter((category: Category) => !category.isSystem)
)

// Следим за перечнем категорий, чтобы автоматически переключать фильтр,
// если, например, пользователь удалил последний элемент выбранного типа.
watch(
  () => categories.value,
  (newCategories) => {
    if (!newCategories.length) {
      return
    }

    const hasSelectedType = newCategories.some(category => category.type === selectedCategoryType.value)
    if (!hasSelectedType) {
      const firstCategory = newCategories[0]
      if (firstCategory) {
        selectedCategoryType.value = firstCategory.type
      }
    }
  },
  { immediate: true }
)

const openModal = (category?: Category) => {
  if (category?.isSystem) {
    toast.add({
      severity: 'info',
      summary: 'Системная категория',
      detail: 'Встроенные категории нельзя редактировать.',
      life: 2500
    })
    return
  }

  editingCategory.value = category ?? null
  modalVisible.value = true
}

const handleDelete = (category: Category) => {
  if (category.isSystem) {
    toast.add({
      severity: 'warn',
      summary: 'Защищенная категория',
      detail: 'Системные категории нельзя удалить.',
      life: 2500
    })
    return
  }

  confirm.require({
    message: `Удалить категорию "${category.name}"?`,
    header: 'Подтверждение удаления',
    acceptLabel: 'Удалить',
    rejectLabel: 'Отмена',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      pendingCategoryId.value = category.id
      const success = await financeStore.deleteCategory(category.id)
      pendingCategoryId.value = null
      toast.add({
        severity: success ? 'success' : 'error',
        summary: success ? 'Категория удалена' : 'Ошибка удаления',
        detail: success ? 'Категория больше недоступна.' : 'Пожалуйста, попробуйте позже.',
        life: 2500
      })
    }
  })
}

defineExpose({
  openModal
})
</script>

<template>
  <AppCard class="categories-manager" variant="muted" padding="lg">
    <template #header>
      <div class="categories-manager__header">
        <div>
          <h3>Категории</h3>
          <p>Организуйте транзакции в понятные группы, чтобы аналитика была точнее.</p>
        </div>
      </div>
    </template>

    <div class="categories-manager__controls">
      <SelectButton
        v-model="selectedCategoryType"
        :options="categoryTypeOptions"
        optionLabel="label"
        optionValue="value"
      />
    </div>

    <div v-if="loadingCategories" class="categories__skeleton">
      <Skeleton v-for="i in 3" :key="i" height="68px" />
    </div>

    <EmptyState
      v-else-if="filteredCategories.length === 0"
      icon="pi-tags"
      title="Нет категорий"
      :description="`Добавьте категорию для ${selectedCategoryType === CATEGORY_TYPE.Income ? 'доходов' : 'расходов'}.`"
      action-label="Создать категорию"
      action-icon="pi pi-plus"
      @action="openModal()"
    />

    <div v-else class="categories__sections">
      <div v-if="userCategories.length" class="category-section">
        <h4>
          <i class="pi pi-user" aria-hidden="true" />
          Личные категории
        </h4>

        <ul class="category-list">
          <li
            v-for="category in userCategories"
            :key="category.id"
            class="category-item"
          >
            <div class="category-info">
              <span class="color-dot" :style="{ backgroundColor: category.color }" />
              <span class="category-name">{{ category.name }}</span>
            </div>

            <div class="category-actions">
              <Button
                label="Изменить"
                text
                @click="openModal(category)"
              />
              <Button
                label="Удалить"
                text
                severity="danger"
                :loading="pendingCategoryId === category.id"
                @click="handleDelete(category)"
              />
            </div>
          </li>
        </ul>
      </div>

      <div v-if="systemCategories.length" class="category-section">
        <h4>
          <i class="pi pi-lock" aria-hidden="true" />
          Системные категории
        </h4>

        <ul class="category-list">
          <li
            v-for="category in systemCategories"
            :key="category.id"
            class="category-item category-item--system"
          >
            <div class="category-info">
              <span class="color-dot" :style="{ backgroundColor: category.color }" />
              <span class="category-name">{{ category.name }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <CategoryFormModal
      v-model:visible="modalVisible"
      :category="editingCategory"
      :default-type="selectedCategoryType"
    />
</AppCard>
</template>

<style scoped>
.categories-manager {
  gap: var(--ft-layout-card-gap);
}

.categories-manager__header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ft-space-2);
}

.categories-manager__header h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.categories-manager__header p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
}

.categories-manager__controls {
  display: flex;
  justify-content: flex-start;
}

.categories__skeleton {
  display: grid;
  gap: var(--ft-space-3);
}

.categories__sections {
  display: flex;
  flex-direction: column;
  gap: clamp(var(--ft-space-4), 2vw, var(--ft-space-5));
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
}

.category-section h4 {
  margin: 0;
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.category-section h4 i {
  color: var(--ft-primary-400);
}

.category-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  margin: 0;
  padding: 0;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ft-space-3) var(--ft-space-4);
  border-radius: var(--ft-radius-lg);
  border: 1px solid var(--ft-border-soft);
  background: var(--ft-surface-base);
  transition: transform var(--ft-transition-fast), box-shadow var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.category-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--ft-shadow-soft);
  border-color: var(--ft-border-default);
}

.category-item--system {
  cursor: not-allowed;
  border-style: dashed;
  border-color: var(--ft-border-subtle);
  opacity: 0.85;
}

.category-info {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(15, 20, 25, 0.2);
  box-shadow: 0 0 0 2px rgba(15, 20, 25, 0.2);
}

.category-name {
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.category-actions {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

@media (max-width: 640px) {
  .categories-manager__header {
    flex-direction: column;
    align-items: stretch;
  }

  .category-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ft-space-3);
  }
}
</style>
