<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useFinanceStore } from '../stores/finance';
import CategoryFormModal from './CategoryFormModal.vue';
import type { Category } from '../types';

const store = useFinanceStore();
const toast = useToast();
const confirm = useConfirm();

const modalVisible = ref(false);
const editingCategory = ref<Category | null>(null);
const busyId = ref<string | null>(null);

const categories = computed(() => store.categories);

const openModal = (category?: Category) => {
  editingCategory.value = category ?? null;
  modalVisible.value = true;
};

const handleDelete = (category: Category) => {
  if (category.isSystem) {
    toast.add({
      severity: 'warn',
      summary: 'Системная категория',
      detail: 'Нельзя удалять встроенные категории.',
      life: 2500,
    });
    return;
  }

  confirm.require({
    message: `Удалить категорию «${category.name}»?`,
    header: 'Подтверждение',
    acceptLabel: 'Удалить',
    rejectLabel: 'Отмена',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      busyId.value = category.id;
      const success = await store.deleteCategory(category.id);
      busyId.value = null;
      toast.add({
        severity: success ? 'success' : 'error',
        summary: success ? 'Категория удалена' : 'Ошибка',
        life: 2500,
      });
    },
  });
};
</script>

<template>
  <section class="manager-card">
    <header class="manager-head">
      <div>
        <p class="section-kicker">Категории</p>
        <h3>Категории расходов</h3>
        <p class="muted">Настройте списки, чтобы быстрее находить операции.</p>
      </div>
      <Button label="Добавить категорию" icon="pi pi-plus" size="small" @click="openModal()" />
    </header>

    <div v-if="categories.length === 0" class="empty-state">
      <p>Категории не найдены. Создайте свою первую.</p>
    </div>

    <ul v-else class="category-list">
      <li v-for="category in categories" :key="category.id" class="category-item">
        <div class="category-info">
          <span class="color-dot" :style="{ backgroundColor: category.color }"></span>
          <div>
            <p class="category-name">
              {{ category.name }}
              <Tag v-if="category.isSystem" value="Системная" severity="info" />
            </p>
            <small class="muted">
              Использована {{ category.frequency }} раз
            </small>
          </div>
        </div>

        <div class="actions">
          <Button label="Изменить" size="small" text @click="openModal(category)" />
          <Button
              label="Удалить"
              size="small"
              text
              severity="danger"
              :disabled="category.isSystem"
              :loading="busyId === category.id"
              @click="handleDelete(category)"
          />
        </div>
      </li>
    </ul>

    <CategoryFormModal v-model:visible="modalVisible" :category="editingCategory" />
  </section>
</template>

<style scoped>
.manager-card {
  border-radius: 20px;
  background: var(--surface-card);
  padding: 1.5rem;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
}

.manager-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.section-kicker {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-color-secondary);
}

.muted {
  color: var(--text-color-secondary);
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-item {
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  padding: 0.85rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.category-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08);
}

.category-name {
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  padding: 1rem;
  border-radius: 12px;
  background: var(--surface-100);
  text-align: center;
}
</style>
