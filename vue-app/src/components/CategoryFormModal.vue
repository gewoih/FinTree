<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import Checkbox from 'primevue/checkbox';
import { useToast } from 'primevue/usetoast';
import { useConfirmDialog } from '../composables/useConfirmDialog';
import type { Category, CategoryType } from '../types';
import { CATEGORY_TYPE } from '../types';
import { useFinanceStore } from '../stores/finance';
import { useFormModal } from '../composables/useFormModal';
import { CATEGORY_ICON_OPTIONS } from '../constants';
import UiButton from '../ui/UiButton.vue';
import FormField from './common/FormField.vue';

const props = withDefaults(defineProps<{
  visible: boolean;
  category?: Category | null;
  defaultType?: CategoryType | null;
  readonly?: boolean;
}>(), {
  category: null,
  defaultType: null,
  readonly: false,
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const store = useFinanceStore();
const { confirmDanger } = useConfirmDialog();
const toast = useToast();
const DEFAULT_COLOR_TOKEN = '--ft-success-500';
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

const resolveDefaultColor = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(DEFAULT_COLOR_TOKEN)
    .trim();

  return HEX_COLOR_REGEX.test(resolved) ? resolved : '';
};

const name = ref('');
const color = ref(resolveDefaultColor());
const icon = ref('pi-tag');
const iconPickerOpen = ref(false);
const iconPickerRef = ref<HTMLElement | null>(null);
const categoryType = ref<CategoryType | null>(null);
const attemptedSubmit = ref(false);
const isMandatory = ref(false);
const isDeleting = ref(false);

const isEditMode = computed(() => Boolean(props.category));
const isExpenseCategory = computed(
  () => (categoryType.value ?? props.category?.type ?? props.defaultType) === CATEGORY_TYPE.Expense
);
const categoryTypeOptions = [
  { label: 'Доход', value: CATEGORY_TYPE.Income },
  { label: 'Расход', value: CATEGORY_TYPE.Expense },
];

const canChooseType = computed(() => !isEditMode.value);

const resetForm = () => {
  name.value = '';
  color.value = resolveDefaultColor();
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
  () => isNameValid.value && isColorValid.value && isIconValid.value && isTypeValid.value
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
  if (props.readonly) {
    showWarning('Редактирование недоступно в режиме просмотра.');
    return;
  }

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
    }
    return;
  }

  const success = await submitCategory();
  if (success) {
    attemptedSubmit.value = false;
    emit('update:visible', false);
  }
};

const handleDelete = () => {
  if (props.readonly || !props.category || isDeleting.value) return;

  confirmDanger({
    message: `Удалить категорию "${props.category.name}"? Все транзакции будут перенесены в «Без категории».`,
    header: 'Удаление категории',
    acceptLabel: 'Удалить',
    onAccept: async () => {
      isDeleting.value = true;
      const success = await store.deleteCategory(props.category!.id);
      isDeleting.value = false;
      toast.add({
        severity: success ? 'success' : 'error',
        summary: success ? 'Категория удалена' : 'Ошибка удаления',
        detail: success ? 'Категория больше недоступна.' : 'Пожалуйста, попробуйте позже.',
        life: 2500
      });

      if (success) {
        emit('update:visible', false);
      }
    },
  });
};
</script>

<template>
  <Dialog
    :visible="props.visible"
    :closable="false"
    modal
    :dismissable-mask="true"
    :style="{ width: '560px' }"
    class="category-dialog"
    append-to="body"
    @update:visible="val => emit('update:visible', val)"
  >
    <div class="category-dialog__container">
      <header class="category-dialog__header">
        <div>
          <h2 class="category-dialog__title">
            {{ props.category ? 'Категория' : 'Новая категория' }}
          </h2>
          <p class="category-dialog__subtitle">
            {{ props.category ? 'Обновите параметры категории.' : 'Создайте категорию для удобной аналитики.' }}
          </p>
        </div>
        <button
          type="button"
          class="category-dialog__close"
          aria-label="Закрыть"
          @click="emit('update:visible', false)"
        >
          <i class="pi pi-times" />
        </button>
      </header>

      <form
        class="category-form"
        novalidate
        @submit.prevent="handleSubmit"
      >
        <div class="category-form__grid">
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
                :disabled="props.readonly"
                :autofocus="props.visible"
              />
            </template>
          </FormField>

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
                :disabled="props.readonly"
                :aria-describedby="fieldAttrs['aria-describedby']"
                :aria-invalid="fieldAttrs['aria-invalid']"
              />
            </template>
          </FormField>
        </div>

        <div class="category-form__grid category-form__grid--two">
          <FormField
            label="Иконка"
            hint="Иконка используется в списках и аналитике."
          >
            <template #default="{ fieldAttrs }">
              <div
                ref="iconPickerRef"
                class="icon-picker"
              >
                <button
                  type="button"
                  class="icon-picker__trigger"
                  :aria-expanded="iconPickerOpen"
                  :disabled="props.readonly"
                  @click="toggleIconPicker"
                >
                  <i :class="['pi', icon]" />
                  <span>Выбрать иконку</span>
                </button>
                <div
                  v-if="iconPickerOpen"
                  class="icon-grid"
                  role="radiogroup"
                  aria-label="Выбор иконки категории"
                  :aria-describedby="fieldAttrs['aria-describedby']"
                  :aria-invalid="fieldAttrs['aria-invalid']"
                >
                  <button
                    v-for="option in CATEGORY_ICON_OPTIONS"
                    :id="`icon-${option.value}`"
                    :key="option.value"
                    type="button"
                    role="radio"
                    class="icon-grid__item"
                    :class="{ 'is-selected': option.value === icon }"
                    :aria-label="option.label"
                    :aria-checked="option.value === icon"
                    :disabled="props.readonly"
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
          </FormField>

          <FormField
            label="Цвет"
            :error="colorError"
            hint="Цвет категории в легендах и тегах."
          >
            <template #default="{ fieldAttrs }">
              <div class="color-picker">
                <input
                  :id="fieldAttrs.id"
                  v-model="color"
                  type="color"
                  class="color-picker__swatch"
                  :disabled="props.readonly"
                  :aria-describedby="fieldAttrs['aria-describedby']"
                  :aria-invalid="fieldAttrs['aria-invalid']"
                >
                <InputText
                  v-model="color"
                  maxlength="7"
                  class="w-full"
                  placeholder="#RRGGBB"
                  :disabled="props.readonly"
                />
              </div>
            </template>
          </FormField>
        </div>

        <FormField
          v-if="isExpenseCategory"
          label="Учет в аналитике"
          hint="Влияет на метрики устойчивости."
        >
          <template #default>
            <label class="mandatory-toggle">
              <Checkbox
                v-model="isMandatory"
                binary
                :disabled="props.readonly"
              />
              <span>Обязательная категория</span>
            </label>
          </template>
        </FormField>

        <div
          v-if="isEditMode"
          class="category-form__danger"
        >
          <div>
            <p class="category-form__danger-title">
              Удалить категорию
            </p>
            <p class="category-form__danger-hint">
              Транзакции перейдут в «Без категории».
            </p>
          </div>
          <UiButton
            type="button"
            variant="danger"
            icon="pi pi-trash"
            class="category-form__danger-button"
            :loading="isDeleting"
            :disabled="props.readonly || isSubmitting || isDeleting"
            aria-label="Удалить категорию"
            @click="handleDelete"
          />
        </div>

        <div class="category-form__footer">
          <div class="actions">
            <UiButton
              type="submit"
              icon="pi pi-check"
              :loading="isSubmitting"
              :disabled="props.readonly || isSubmitting || isDeleting"
            >
              {{ props.category ? 'Сохранить' : 'Создать' }}
            </UiButton>
          </div>
        </div>
      </form>
    </div>
  </Dialog>
</template>

<style scoped src="../styles/components/category-form-modal.css"></style>
