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
const areCategoriesLoading = computed(() => store.areCategoriesLoading);

// Separate system and user categories
const systemCategories = computed(() => categories.value.filter(c => c.isSystem));
const userCategories = computed(() => categories.value.filter(c => !c.isSystem));

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
  <section class="manager-card ft-card ft-card--muted">
    <header class="manager-head">
      <div class="ft-section__head">
        <span class="ft-kicker">Категории</span>
        <h3>Категории расходов</h3>
        <p class="ft-text ft-text--muted">Настройте списки, чтобы быстрее находить операции.</p>
      </div>
      <Button label="Добавить категорию" icon="pi pi-plus" size="small" @click="openModal()" />
    </header>

    <div v-if="areCategoriesLoading" class="ft-empty">
      <p class="ft-text ft-text--muted">Загружаем категории...</p>
    </div>

    <div v-else-if="categories.length === 0" class="ft-empty">
      <p class="ft-text ft-text--muted">Категории не найдены. Создайте свою первую.</p>
    </div>

    <div v-else class="categories-container">
      <!-- User Categories Section -->
      <div v-if="userCategories.length > 0" class="category-section">
        <h4 class="section-title">
          <i class="pi pi-user"></i>
          Пользовательские категории
        </h4>
        <ul class="category-list">
          <li v-for="category in userCategories" :key="category.id" class="category-item">
            <div class="category-info">
              <span class="color-dot" :style="{ backgroundColor: category.color }"></span>
              <div>
                <p class="category-name">{{ category.name }}</p>
              </div>
            </div>

            <div class="actions">
              <Button
                  label="Изменить"
                  size="small"
                  text
                  @click="openModal(category)"
              />
              <Button
                  label="Удалить"
                  size="small"
                  text
                  severity="danger"
                  :loading="busyId === category.id"
                  @click="handleDelete(category)"
              />
            </div>
          </li>
        </ul>
      </div>

      <!-- System Categories Section -->
      <div v-if="systemCategories.length > 0" class="category-section">
        <h4 class="section-title">
          <i class="pi pi-lock"></i>
          Системные категории
        </h4>
        <ul class="category-list">
          <li v-for="category in systemCategories" :key="category.id" class="category-item category-item--system">
            <div class="category-info">
              <span class="color-dot" :style="{ backgroundColor: category.color }"></span>
              <div>
                <p class="category-name">
                  {{ category.name }}
                  <Tag value="Системная" severity="info" rounded />
                </p>
                <small class="ft-text ft-text--muted">
                  Защищена от изменений
                </small>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <CategoryFormModal v-model:visible="modalVisible" :category="editingCategory" />
  </section>
</template>

<style scoped>
.manager-card {
  gap: clamp(1.5rem, 2vw, 2rem);
}

.manager-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.categories-container {
  display: flex;
  flex-direction: column;
  gap: clamp(2rem, 3vw, 2.5rem);
}

.category-section {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 1.5vw, 1.25rem);
}

.section-title {
  margin: 0;
  font-size: clamp(1rem, 1.2vw, 1.1rem);
  font-weight: 600;
  color: var(--ft-heading);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--ft-border-soft);
}

.section-title i {
  font-size: 0.9rem;
  color: var(--ft-accent);
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.85rem, 1.2vw, 1.2rem);
}

.category-item {
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-lg);
  padding: clamp(0.95rem, 1.2vw, 1.2rem) clamp(1.1rem, 1.6vw, 1.4rem);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: clamp(0.75rem, 1vw, 1rem);
  background: rgba(13, 22, 43, 0.8);
  box-shadow: 0 18px 40px rgba(8, 15, 34, 0.4);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.category-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 44px rgba(8, 15, 34, 0.48);
}

.category-item--system {
  background: rgba(13, 22, 43, 0.5);
  opacity: 0.85;
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
</style>
