<script setup lang="ts">
import Tag from 'primevue/tag';

withDefaults(
  defineProps<{
    label: string;
    severity?: 'success' | 'info' | 'warning' | 'danger' | 'secondary';
  }>(),
  {
    severity: 'secondary'
  }
);
</script>

<template>
  <Tag :value="label" :severity="severity" class="ui-badge" />
</template>

<style scoped>
.ui-badge {
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
