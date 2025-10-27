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
  if (category?.isSystem) {
    toast.add({
      severity: 'info',
      summary: 'Системная категория',
      detail: 'Встроенные категории недоступны для редактирования.',
      life: 2500,
    });
    return;
  }

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
            <small class="muted" v-if="category.isSystem">
              Системная категория защищена от изменений
            </small>
          </div>
        </div>

        <div class="actions">
          <Button
              label="Изменить"
              size="small"
              text
              @click="openModal(category)"
              :disabled="category.isSystem"
          />
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
  border-radius: 22px;
  background: var(--ft-surface-elevated);
  padding: 1.75rem;
  border: 1px solid var(--ft-border-soft);
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.manager-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.section-kicker {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ft-text-muted);
  font-weight: 600;
}

.muted {
  color: var(--ft-text-muted);
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-item {
  border: 1px solid var(--ft-border-soft);
  border-radius: 18px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: rgba(248, 250, 252, 0.65);
}

.category-info {
  display: flex;
  gap: 0.85rem;
  align-items: center;
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.06);
}

.category-name {
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ft-heading);
}

.actions {
  display: flex;
  gap: 0.6rem;
}

.empty-state {
  padding: 1.25rem;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.7);
  border: 1px dashed var(--ft-border-soft);
  text-align: center;
  color: var(--ft-text-muted);
}
</style>
