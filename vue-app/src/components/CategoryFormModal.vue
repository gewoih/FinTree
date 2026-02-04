<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import Checkbox from 'primevue/checkbox';
import type { Category, CategoryType } from '../types';
import { CATEGORY_TYPE } from '../types';
import { useFinanceStore } from '../stores/finance';
import { useFormModal } from '../composables/useFormModal';
import { CATEGORY_ICON_OPTIONS } from '../constants';

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
const icon = ref('pi-tag');
const iconPickerOpen = ref(false);
const iconPickerRef = ref<HTMLElement | null>(null);
const categoryType = ref<CategoryType | null>(null);
const attemptedSubmit = ref(false);
const isMandatory = ref(false);

const isEditMode = computed(() => Boolean(props.category));
const isSystemCategory = computed(() => props.category?.isSystem ?? false);
const isExpenseCategory = computed(
  () => (categoryType.value ?? props.defaultType) === CATEGORY_TYPE.Expense
);

const categoryTypeOptions = [
  { label: 'Доход', value: CATEGORY_TYPE.Income },
  { label: 'Расход', value: CATEGORY_TYPE.Expense },
];

const canChooseType = computed(() => !isEditMode.value);

const resetForm = () => {
  name.value = '';
  color.value = DEFAULT_COLOR;
  icon.value = 'pi-tag';
  iconPickerOpen.value = false;
  categoryType.value = props.defaultType ?? null;
  isMandatory.value = false;
  attemptedSubmit.value = false;
};

watch(
  () => props.visible,
  visible => {
    if (visible) {
      if (props.category) {
        name.value = props.category.name;
        color.value = props.category.color;
        icon.value = props.category.icon ?? 'pi-tag';
        categoryType.value = props.category.type;
        isMandatory.value = props.category.isMandatory ?? false;
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
const isIconValid = computed(() => icon.value.trim().length > 0);
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
  () => isNameValid.value && isColorValid.value && isIconValid.value && isTypeValid.value && !isSystemCategory.value
);

const toggleIconPicker = () => {
  iconPickerOpen.value = !iconPickerOpen.value;
};

const closeIconPicker = () => {
  iconPickerOpen.value = false;
};

const handleDocumentClick = (event: MouseEvent) => {
  if (!iconPickerOpen.value) return;
  const target = event.target as Node | null;
  if (iconPickerRef.value && target && !iconPickerRef.value.contains(target)) {
    iconPickerOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});

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
        icon: icon.value,
        isMandatory: isMandatory.value,
      });
    }

    return await store.createCategory({
      categoryType: categoryType.value ?? CATEGORY_TYPE.Expense,
      name: name.value.trim(),
      color: color.value,
      icon: icon.value,
      isMandatory: isMandatory.value,
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
    } else if (!isIconValid.value) {
      showWarning('Выберите иконку для категории.');
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
    <form
      class="category-form"
      novalidate
      @submit.prevent="handleSubmit"
    >
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

      <FormField
        label="Название"
        :error="nameError"
        required
      >
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

      <FormField label="Иконка">
        <template #default="{ fieldAttrs }">
          <div
            ref="iconPickerRef"
            class="icon-picker"
          >
            <button
              type="button"
              class="icon-picker__trigger"
              :aria-expanded="iconPickerOpen"
              @click="toggleIconPicker"
            >
              <i :class="['pi', icon]" />
              <span>Выбрать иконку</span>
            </button>
            <div
              v-if="iconPickerOpen"
              class="icon-grid"
              role="listbox"
              :aria-describedby="fieldAttrs['aria-describedby']"
              :aria-invalid="fieldAttrs['aria-invalid']"
              :aria-activedescendant="icon ? `icon-${icon}` : undefined"
            >
              <button
                v-for="option in CATEGORY_ICON_OPTIONS"
                :key="option.value"
                type="button"
                :id="`icon-${option.value}`"
                class="icon-grid__item"
                :class="{ 'is-selected': option.value === icon }"
                :aria-pressed="option.value === icon"
                @click="
                  () => {
                    icon = option.value;
                    closeIconPicker();
                  }
                "
              >
                <i :class="['pi', option.value]" />
              </button>
            </div>
          </div>
        </template>
        <template #hint>
          Иконка отображается в списках и аналитике.
        </template>
      </FormField>

      <FormField
        label="Цвет"
        :error="colorError"
        hint="Цвет используется для легенд и тегов списка."
      >
        <template #default="{ fieldAttrs }">
          <div class="color-picker">
            <input
              :id="fieldAttrs.id"
              v-model="color"
              type="color"
              class="color-picker__swatch"
              :aria-describedby="fieldAttrs['aria-describedby']"
              :aria-invalid="fieldAttrs['aria-invalid']"
            >
            <InputText
              v-model="color"
              maxlength="7"
              class="w-full"
              placeholder="#10B981"
            />
          </div>
        </template>
      </FormField>

      <FormField
        v-if="isExpenseCategory"
        label="Обязательность"
        hint="Обязательные траты учитываются в метриках устойчивости."
      >
        <template #default>
          <label class="mandatory-toggle">
            <Checkbox v-model="isMandatory" binary />
            <span>Обязательная категория</span>
          </label>
        </template>
      </FormField>

      <div
        v-if="isSystemCategory"
        class="system-category-alert"
      >
        Эта категория системная и не может быть изменена.
      </div>

      <div class="actions">
        <AppButton
          type="button"
          variant="ghost"
          @click="emit('update:visible', false)"
        >
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

.icon-picker {
  display: grid;
  gap: var(--ft-space-2);
  position: relative;
}

.icon-picker__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  padding: var(--ft-space-2) var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  border: 1px solid var(--ft-border-subtle);
  background: transparent;
  color: var(--ft-text-primary);
  cursor: pointer;
}

.icon-picker__trigger i {
  font-size: 1.1rem;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
  gap: var(--ft-space-2);
  max-height: 220px;
  padding: var(--ft-space-2);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
  background: var(--ft-surface);
  overflow: auto;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

.icon-grid__item {
  display: grid;
  place-items: center;
  inline-size: 38px;
  block-size: 38px;
  border-radius: var(--ft-radius-md);
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  color: var(--ft-text-secondary);
}

.icon-grid__item i {
  font-size: 1.1rem;
}

.icon-grid__item:hover {
  border-color: var(--ft-border-strong);
  color: var(--ft-text-primary);
}

.icon-grid__item.is-selected {
  border-color: var(--ft-primary-500);
  color: var(--ft-primary-600);
  background: rgba(59, 130, 246, 0.08);
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

.mandatory-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  color: var(--ft-text-primary);
  font-weight: var(--ft-font-medium);
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
