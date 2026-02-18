<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import UiSkeleton from '@/ui/UiSkeleton.vue'
import UiSelectButton from '@/ui/UiSelectButton.vue'
import UiBadge from '@/ui/UiBadge.vue'
import { useFinanceStore } from '../stores/finance'
import CategoryFormModal from './CategoryFormModal.vue'
import type { Category, CategoryType } from '../types'
import { CATEGORY_TYPE } from '../types'
import UiCard from '@/ui/UiCard.vue'
import UiButton from "@/ui/UiButton.vue";
import EmptyState from "@/components/common/EmptyState.vue";

const props = withDefaults(defineProps<{
  readonly?: boolean
}>(), {
  readonly: false
})

const financeStore = useFinanceStore()
const modalVisible = ref(false)
const editingCategory = ref<Category | null>(null)
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
  if (props.readonly) return
  editingCategory.value = category ?? null
  modalVisible.value = true
}

defineExpose({
  openModal
})
</script>

<template>
  <UiCard
    class="categories-manager"
    variant="muted"
    padding="lg"
  >
    <template #header>
      <div class="categories-manager__header">
        <div class="categories-manager__header-inner">
          <div class="categories-manager__title">
            <h3>Категории</h3>
            <p>Организуйте транзакции в понятные группы, чтобы аналитика была точнее.</p>
          </div>
          <UiButton
            label="Новая категория"
            icon="pi pi-plus"
            variant="secondary"
            size="sm"
            :disabled="props.readonly"
            @click="openModal()"
          />
        </div>
      </div>
    </template>

    <div class="categories-manager__body">
      <div class="categories-manager__controls">
        <UiSelectButton
          v-model="selectedCategoryType"
          class="categories-toggle"
          :options="categoryTypeOptions"
          option-label="label"
          option-value="value"
        />
      </div>

      <div
        v-if="loadingCategories"
        class="categories__skeleton"
        role="status"
        aria-live="polite"
      >
        <UiSkeleton
          v-for="i in 3"
          :key="i"
          height="120px"
        />
      </div>

      <EmptyState
        v-else-if="filteredCategories.length === 0"
        icon="pi-tags"
        title="Нет категорий"
        :description="`Добавьте категорию для ${selectedCategoryType === CATEGORY_TYPE.Income ? 'доходов' : 'расходов'}.`"
        :action-label="props.readonly ? '' : 'Создать категорию'"
        action-icon="pi pi-plus"
        @action="openModal()"
      />

      <div
        v-else
        class="categories__sections"
      >
        <ul class="category-list">
          <li
            v-for="category in filteredCategories"
            :key="category.id"
            class="category-item"
          >
            <button
              type="button"
              class="category-card"
              :aria-label="`Редактировать категорию ${category.name}`"
              :disabled="props.readonly"
              @click="openModal(category)"
            >
              <div class="category-card__top">
                <div class="category-info">
                  <span
                    class="color-dot"
                    :style="{ backgroundColor: category.color }"
                  />
                  <i
                    :class="['pi', category.icon || 'pi-tag', 'category-icon']"
                    aria-hidden="true"
                  />
                  <span class="category-name">
                    {{ category.name }}
                    <UiBadge
                      v-if="category.isMandatory"
                      severity="info"
                      class="category-mandatory"
                    >
                      Обязательная
                    </UiBadge>
                  </span>
                </div>
                <i
                  class="pi pi-angle-right category-chevron"
                  aria-hidden="true"
                />
              </div>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <CategoryFormModal
      v-model:visible="modalVisible"
      :category="editingCategory"
      :default-type="selectedCategoryType"
      :readonly="props.readonly"
    />
  </UiCard>
</template>

<style scoped>
.categories-manager {
  gap: var(--ft-space-4);
}

.categories-manager__header {
  width: 100%;
}

.categories-manager__header-inner {
  display: flex;
  gap: var(--ft-space-4);
  align-items: center;
  justify-content: space-between;

  width: 100%;
  max-width: 980px;
  margin: 0 auto;
}

.categories-manager__title {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
}

.categories-manager__header h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.categories-manager__header p {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
}

.categories-manager__controls {
  display: flex;
  justify-content: flex-start;
}

.categories-manager__body {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  width: 100%;
  max-width: 980px;
  margin: 0 auto;
}

.categories__skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--ft-space-4);
}

.categories__sections {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
}

.category-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--ft-space-4);

  width: 100%;
  margin: 0;
  padding: 0;

  list-style: none;
}

.category-item {
  margin: 0;
}

.category-card {
  cursor: pointer;

  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);

  width: 100%;
  padding: var(--ft-space-4);

  text-align: left;

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-lg);

  transition:
    border-color var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.category-card:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--ft-surface-base) 90%, var(--ft-primary-500, #3b82f6) 10%);
  border-color: var(--ft-border-default);
  box-shadow: var(--ft-shadow-sm);
}

.category-card:disabled {
  cursor: not-allowed;
  transform: none;
  opacity: 0.7;
  box-shadow: none;
}

.category-card:focus-visible {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}

.category-card__top {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;

  width: 100%;
}

.category-info {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

.color-dot {
  width: 14px;
  height: 14px;
  border: 1px solid rgb(15 20 25 / 20%);
  border-radius: 50%;
}

.category-icon {
  font-size: 1.05rem;
  color: var(--ft-text-secondary);
}

.category-name {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.category-chevron {
  font-size: 1rem;
  color: var(--ft-text-tertiary);
}

.category-mandatory {
  padding: 0.15rem 0.45rem;

  font-size: 0.7rem;
  color: var(--ft-primary-700, #1d4ed8) !important;

  background: color-mix(in srgb, var(--ft-primary-200, #dbeafe) 55%, transparent) !important;
  border-radius: 999px;
}

@media (width <= 640px) {
  .categories-manager__header-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .category-list {
    grid-template-columns: 1fr;
  }
}
</style>
