<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import type { Category, CategoryType } from '../types';
import { CATEGORY_TYPE } from '../types';
import { useFinanceStore } from '../stores/finance';
import { useFormModal } from '../composables/useFormModal';

const props = defineProps<{
  visible: boolean;
  category?: Category | null;
  defaultType?: CategoryType;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const store = useFinanceStore();
const DEFAULT_COLOR = '#10b981';
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

const name = ref('');
const color = ref(DEFAULT_COLOR);
const categoryType = ref<CategoryType | null>(null);
const attemptedSubmit = ref(false);

const isEditMode = computed(() => Boolean(props.category));
const isSystemCategory = computed(() => props.category?.isSystem ?? false);

const categoryTypeOptions = [
  { label: 'Доход', value: CATEGORY_TYPE.Income },
  { label: 'Расход', value: CATEGORY_TYPE.Expense },
];

const canChooseType = computed(() => !isEditMode.value);

const resetForm = () => {
  name.value = '';
  color.value = DEFAULT_COLOR;
  categoryType.value = props.defaultType ?? null;
  attemptedSubmit.value = false;
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

const isNameValid = computed(() => name.value.trim().length > 0);
const isColorValid = computed(() => HEX_COLOR_REGEX.test(color.value));
const isTypeValid = computed(() => !canChooseType.value || Boolean(categoryType.value));

const nameError = computed(() => {
  if (!attemptedSubmit.value) return null;
  return isNameValid.value ? null : 'Введите название категории.';
});

const typeError = computed(() => {
  if (!attemptedSubmit.value || !canChooseType.value) return null;
  return categoryType.value ? null : 'Выберите тип категории.';
});

const colorError = computed(() => {
  if (!attemptedSubmit.value) return null;
  return isColorValid.value ? null : 'Используйте формат #RRGGBB.';
});

const isFormValid = computed(
  () => isNameValid.value && isColorValid.value && isTypeValid.value && !isSystemCategory.value
);

const { isSubmitting, handleSubmit: submitCategory, showWarning } = useFormModal(
  async () => {
    if (isSystemCategory.value) {
      showWarning('Системные категории нельзя редактировать.');
      return false;
    }

    if (props.category) {
      return await store.updateCategory({
        id: props.category.id,
        categoryType: categoryType.value ?? props.category.type,
        name: name.value.trim(),
        color: color.value,
      });
    }

    return await store.createCategory({
      categoryType: categoryType.value ?? CATEGORY_TYPE.Expense,
      name: name.value.trim(),
      color: color.value,
    });
  },
  {
    successMessage: 'Категория сохранена.',
    errorMessage: 'Не удалось сохранить категорию.',
  }
);

const handleSubmit = async () => {
  attemptedSubmit.value = true;

  if (!isFormValid.value) {
    if (!isTypeValid.value) {
      showWarning('Выберите тип категории.');
    } else if (!isNameValid.value) {
      showWarning('Введите название категории.');
    } else if (!isColorValid.value) {
      showWarning('Введите корректный цвет в формате #RRGGBB.');
    } else if (isSystemCategory.value) {
      showWarning('Системные категории нельзя редактировать.');
    }
    return;
  }

  const success = await submitCategory();
  if (success) {
    attemptedSubmit.value = false;
    emit('update:visible', false);
  }
};
</script>

<template>
  <Dialog
    :visible="props.visible"
    :header="props.category ? 'Редактирование категории' : 'Создание категории'"
    modal
    :style="{ width: '440px' }"
    @update:visible="val => emit('update:visible', val)"
  >
    <form @submit.prevent="handleSubmit" class="category-form" novalidate>
      <FormField
        v-if="canChooseType"
        label="Тип"
        :error="typeError"
        required
      >
        <template #default="{ fieldAttrs }">
          <SelectButton
            v-model="categoryType"
            :options="categoryTypeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            class="w-full"
            :aria-describedby="fieldAttrs['aria-describedby']"
            :aria-invalid="fieldAttrs['aria-invalid']"
            :pt="{
              button: { class: 'category-form__type-button' },
            }"
          />
        </template>
      </FormField>

      <FormField label="Название" :error="nameError" required>
        <template #default="{ fieldAttrs }">
          <InputText
            v-bind="fieldAttrs"
            v-model="name"
            placeholder="Например, «Транспорт»"
            class="w-full"
            autocomplete="off"
          />
        </template>
      </FormField>

      <FormField label="Цвет" :error="colorError" hint="Цвет используется для легенд и тегов списка.">
        <template #default="{ fieldAttrs }">
          <div class="color-picker">
            <input
              :id="fieldAttrs.id"
              v-model="color"
              type="color"
              class="color-picker__swatch"
              :aria-describedby="fieldAttrs['aria-describedby']"
              :aria-invalid="fieldAttrs['aria-invalid']"
            />
            <InputText
              v-model="color"
              maxlength="7"
              class="w-full"
              placeholder="#10B981"
            />
          </div>
        </template>
      </FormField>

      <div v-if="isSystemCategory" class="system-category-alert">
        Эта категория системная и не может быть изменена.
      </div>

      <div class="actions">
        <AppButton type="button" variant="ghost" @click="emit('update:visible', false)">
          Отмена
        </AppButton>
        <AppButton
          type="submit"
          icon="pi pi-check"
          :loading="isSubmitting"
          :disabled="isSystemCategory || isSubmitting"
        >
          {{ props.category ? 'Сохранить' : 'Создать' }}
        </AppButton>
      </div>
    </form>
  </Dialog>
</template>

<style scoped>
.category-form {
  display: grid;
  gap: var(--ft-space-4);
}

.category-form__type-button {
  flex: 1;
  padding: var(--ft-space-2) var(--ft-space-3);
}

.color-picker {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--ft-space-3);
  align-items: center;
}

.color-picker__swatch {
  inline-size: 42px;
  block-size: 42px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-md);
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.color-picker__swatch::-webkit-color-swatch-wrapper {
  padding: 0;
  border-radius: inherit;
}

.color-picker__swatch::-webkit-color-swatch {
  border: none;
  border-radius: inherit;
}

.system-category-alert {
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  background: rgba(234, 179, 8, 0.12);
  color: var(--ft-warning-700);
  font-size: var(--ft-text-sm);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ft-space-3);
  margin-top: var(--ft-space-3);
}

@media (max-width: 576px) {
  .category-form {
    gap: var(--ft-space-3);
  }

  .actions {
    flex-direction: column;
  }

  .actions :deep(.app-button) {
    width: 100%;
  }
}
</style>
