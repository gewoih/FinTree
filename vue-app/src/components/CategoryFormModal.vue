<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import { useToast } from 'primevue/usetoast';
import type { Category, CategoryType } from '../types';
import { CATEGORY_TYPE } from '../types';
import { useFinanceStore } from '../stores/finance';

const props = defineProps<{
  visible: boolean;
  category?: Category | null;
  defaultType?: CategoryType;
}>();

const emit = defineEmits(['update:visible']);

const store = useFinanceStore();
const toast = useToast();
const DEFAULT_COLOR = '#10b981';
const name = ref('');
const color = ref(DEFAULT_COLOR);
const categoryType = ref<CategoryType | null>(null);
const isSubmitting = ref(false);

const categoryTypeOptions = [
  { label: 'Доход', value: CATEGORY_TYPE.Income },
  { label: 'Расход', value: CATEGORY_TYPE.Expense },
];

const resetForm = () => {
  name.value = '';
  color.value = DEFAULT_COLOR;
  categoryType.value = props.defaultType ?? null;
};

watch(
  () => props.visible,
  visible => {
    if (visible) {
      if (props.category) {
        name.value = props.category.name;
        color.value = props.category.color;
        categoryType.value = props.category.type;
      } else {
        resetForm();
      }
    } else {
      resetForm();
    }
  }
);

const handleSubmit = async () => {
  if (!categoryType.value) {
    toast.add({
      severity: 'warn',
      summary: 'Выберите тип категории',
      life: 2500,
    });
    return;
  }

  if (!name.value) {
    toast.add({
      severity: 'warn',
      summary: 'Введите название',
      detail: 'Название категории обязательно.',
      life: 2500,
    });
    return;
  }

  isSubmitting.value = true;
  let success = false;

  if (props.category?.isSystem) {
    toast.add({
      severity: 'warn',
      summary: 'Системная категория',
      detail: 'Встроенные категории нельзя изменить.',
      life: 2500,
    });
    isSubmitting.value = false;
    return;
  }

  if (props.category) {
    success = await store.updateCategory({
      id: props.category.id,
      categoryType: categoryType.value!,
      name: name.value.trim(),
      color: color.value,
    });
  } else {
    success = await store.createCategory({
      categoryType: categoryType.value!,
      name: name.value.trim(),
      color: color.value,
    });
  }

  isSubmitting.value = false;

  toast.add({
    severity: success ? 'success' : 'error',
    summary: success ? 'Категория сохранена' : 'Не удалось сохранить категорию',
    life: 2500,
  });

  if (success) emit('update:visible', false);
};
</script>

<template>
  <Dialog
      :visible="props.visible"
      :header="props.category ? 'Редактирование категории' : 'Создание категории'"
      :modal="true"
      :style="{ width: '420px' }"
      @update:visible="val => emit('update:visible', val)"
  >
    <form @submit.prevent="handleSubmit" class="category-form">
      <div class="field" v-if="!props.category">
        <label for="category-type">Тип</label>
        <SelectButton
            id="category-type"
            v-model="categoryType"
            :options="categoryTypeOptions"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
            class="w-full"
        />
      </div>

      <div class="field">
        <label for="category-name">Название</label>
        <InputText
            id="category-name"
            v-model="name"
            placeholder="Например, 'Транспорт'"
            class="w-full"
        />
      </div>

      <div class="field color-field">
        <label for="category-color">Цвет</label>
        <div class="color-picker">
          <input id="category-color" v-model="color" type="color" />
          <InputText v-model="color" class="w-full" />
        </div>
      </div>

      <div class="actions">
        <Button
            type="button"
            label="Отмена"
            severity="secondary"
            outlined
            @click="emit('update:visible', false)"
        />
        <Button
            type="submit"
            :label="props.category ? 'Сохранить' : 'Создать'"
            icon="pi pi-check"
            :loading="isSubmitting"
        />
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.category-form {
  display: flex;
  flex-direction: column;
  gap: clamp(0.85rem, 1vw, 1.1rem);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

label {
  font-weight: 600;
  color: var(--ft-heading);
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.color-field input[type='color'] {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: var(--ft-radius-sm);
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
