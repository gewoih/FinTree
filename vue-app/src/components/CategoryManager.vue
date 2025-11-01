<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useFinanceStore } from '../stores/finance'
import CategoryFormModal from './CategoryFormModal.vue'
import type { Category } from '../types'

const financeStore = useFinanceStore()
const toast = useToast()
const confirm = useConfirm()

const modalVisible = ref(false)
const editingCategory = ref<Category | null>(null)
const pendingCategoryId = ref<string | null>(null)

const categories = computed<Category[]>(() => financeStore.categories ?? [])
const loadingCategories = computed(() => financeStore.areCategoriesLoading)

const systemCategories = computed(() => categories.value.filter((category: Category) => category.isSystem))
const userCategories = computed(() => categories.value.filter((category: Category) => !category.isSystem))

const openModal = (category?: Category) => {
  if (category?.isSystem) {
    toast.add({
      severity: 'info',
      summary: 'System category',
      detail: 'Built-in categories cannot be edited.',
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
      summary: 'Protected category',
      detail: 'System categories cannot be removed.',
      life: 2500
    })
    return
  }

  confirm.require({
    message: `Delete category “${category.name}”?`,
    header: 'Confirm deletion',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      pendingCategoryId.value = category.id
      const success = await financeStore.deleteCategory(category.id)
      pendingCategoryId.value = null
      toast.add({
        severity: success ? 'success' : 'error',
        summary: success ? 'Category removed' : 'Delete failed',
        detail: success ? 'The category is no longer available.' : 'Please try again later.',
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
  <section class="categories ft-card">
    <header class="categories__header">
      <div>
        <h3>Categories</h3>
        <p>Organise expenses into meaningful groups for faster analytics.</p>
      </div>
      <Button
        label="Create category"
        icon="pi pi-plus"
        @click="openModal()"
      />
    </header>

    <div v-if="loadingCategories" class="categories__skeleton">
      <Skeleton v-for="i in 3" :key="i" height="68px" />
    </div>

    <EmptyState
      v-else-if="categories.length === 0"
      icon="pi-tags"
      title="No categories created"
      description="Add your first category to start grouping transactions."
      action-label="Create category"
      action-icon="pi pi-plus"
      @action="openModal()"
    />

    <div v-else class="categories__sections">
      <div v-if="userCategories.length" class="category-section">
        <h4>
          <i class="pi pi-user" aria-hidden="true" />
          Personal categories
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
                label="Edit"
                text
                @click="openModal(category)"
              />
              <Button
                label="Delete"
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
          System categories
        </h4>

        <ul class="category-list">
          <li
            v-for="category in systemCategories"
            :key="category.id"
            class="category-item category-item--system"
          >
            <div class="category-info">
              <span class="color-dot" :style="{ backgroundColor: category.color }" />
              <span class="category-name">
                {{ category.name }}
                <Tag value="System" severity="info" rounded />
              </span>
            </div>
            <span class="category-note">Protected · cannot edit or delete</span>
          </li>
        </ul>
      </div>
    </div>

    <CategoryFormModal
      v-model:visible="modalVisible"
      :category="editingCategory"
    />
  </section>
</template>

<style scoped>
.categories {
  gap: var(--ft-space-5);
}

.categories__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-4);
}

.categories__header h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
  color: var(--ft-heading);
}

.categories__header p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-muted);
  font-size: var(--ft-text-sm);
}

.categories__skeleton {
  display: grid;
  gap: var(--ft-space-3);
}

.categories__sections {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
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
  color: var(--ft-heading);
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.category-section h4 i {
  color: var(--ft-primary-500);
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
  padding: var(--ft-space-3);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-lg);
  background: var(--ft-surface-soft);
  transition: transform var(--ft-transition-fast), box-shadow var(--ft-transition-fast), border-color var(--ft-transition-fast);
}

.category-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--ft-shadow-soft);
  border-color: var(--ft-border-default);
}

.category-item--system {
  cursor: not-allowed;
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
  border: 2px solid rgba(0, 0, 0, 0.08);
}

.category-name {
  font-weight: var(--ft-font-medium);
  color: var(--ft-heading);
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.category-note {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-muted);
}

.category-actions {
  display: flex;
  align-items: center;
  gap: var(--ft-space-1);
}

@media (max-width: 600px) {
  .category-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ft-space-3);
  }

  .category-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
