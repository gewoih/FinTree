<script setup lang="ts">
import { useAttrs } from 'vue';
import Tag from 'primevue/tag';

const props = withDefaults(
  defineProps<{
    label?: string;
    severity?: 'success' | 'info' | 'warning' | 'danger' | 'secondary';
    color?: string;
  }>(),
  {
    label: '',
    severity: 'secondary',
    color: '',
  }
);

const attrs = useAttrs();
</script>

<template>
  <Tag
    class="ui-badge"
    :severity="props.severity"
    :value="props.label"
    :style="props.color ? { '--ui-badge-color': props.color } : undefined"
    v-bind="attrs"
  >
    <slot />
  </Tag>
</template>

<style scoped>
.ui-badge {
  padding: 2px var(--space-3);
  font-size: var(--ft-text-xs);
  font-weight: 600;
  border-radius: 999px;
}

.ui-badge[style*='--ui-badge-color'] {
  color: var(--ft-text-inverse);
  background: var(--ui-badge-color);
}
</style>
