<script setup lang="ts">
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import type { Category } from '../types';
import { useFinanceStore } from '../stores/finance';

const props = defineProps<{
  visible: boolean;
  category?: Category | null;
}>();

const emit = defineEmits(['update:visible']);

const store = useFinanceStore();
const toast = useToast();
const name = ref('');
const color = ref('#10b981');
const isSubmitting = ref(false);

watch(
  () => props.visible,
  visible => {
    if (visible) {
      name.value = props.category?.name ?? '';
      color.value = props.category?.color ?? '#10b981';
    }
  }
);

const handleSubmit = async () => {
  if (!name.value) {
    toast.add({
      severity: 'warn',
      summary: 'Name is required',
      life: 2500,
    });
    return;
  }

  isSubmitting.value = true;
  let success = false;

  if (props.category?.isSystem) {
    toast.add({
      severity: 'warn',
      summary: 'System category',
      detail: 'Built-in categories cannot be edited.',
      life: 2500,
    });
    isSubmitting.value = false;
    return;
  }

  if (props.category) {
    success = await store.updateCategory({
      id: props.category.id,
      name: name.value.trim(),
      color: color.value,
    });
  } else {
    success = await store.createCategory({
      name: name.value.trim(),
      color: color.value,
    });
  }

  isSubmitting.value = false;

  toast.add({
    severity: success ? 'success' : 'error',
    summary: success ? 'Category saved' : 'Something went wrong',
    life: 2500,
  });

  if (success) emit('update:visible', false);
};
</script>

<template>
  <Dialog
      :visible="props.visible"
      :header="props.category ? 'Edit category' : 'New category'"
      :modal="true"
      :style="{ width: '420px' }"
      @update:visible="val => emit('update:visible', val)"
  >
    <form @submit.prevent="handleSubmit" class="category-form">
      <div class="field">
        <label for="category-name">Name</label>
        <InputText
            id="category-name"
            v-model="name"
            placeholder="For example, “Transport”"
            class="w-full"
        />
      </div>

      <div class="field color-field">
        <label for="category-color">Color</label>
        <div class="color-picker">
          <input id="category-color" v-model="color" type="color" />
          <InputText v-model="color" class="w-full" />
        </div>
      </div>

      <div class="actions">
        <Button
            type="button"
            label="Cancel"
            severity="secondary"
            outlined
            @click="emit('update:visible', false)"
        />
        <Button
            type="submit"
            :label="props.category ? 'Save' : 'Add'"
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
