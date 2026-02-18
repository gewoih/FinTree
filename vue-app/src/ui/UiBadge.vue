<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Tag from 'primevue/tag';
import type { TagPassThroughOptions } from 'primevue/tag';
import { mergePt } from './prime/pt';

const props = withDefaults(
  defineProps<{
    label?: string;
    value?: string;
    severity?: 'success' | 'info' | 'warning' | 'danger' | 'secondary';
    color?: string;
    unstyled?: boolean;
    pt?: TagPassThroughOptions;
  }>(),
  {
    label: '',
    value: '',
    severity: 'secondary',
    color: '',
    pt: () => ({}),
  }
);

const attrs = useAttrs();
const resolvedLabel = computed(() => props.label || props.value || '');

const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: 'ui-badge__root',
      },
      label: {
        class: 'ui-badge__label',
      },
    } as TagPassThroughOptions,
    props.pt
  )
);
</script>

<template>
  <Tag
    class="ui-badge"
    :severity="props.severity"
    :value="resolvedLabel"
    :style="props.color ? { '--ui-badge-color': props.color } : undefined"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
    v-bind="attrs"
  >
    <slot />
  </Tag>
</template>

<style scoped>
.ui-badge {
  padding: var(--ft-space-1) var(--ft-space-3);
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  border-radius: var(--ft-radius-full);
}

.ui-badge[style*='--ui-badge-color'] {
  color: var(--ft-text-inverse);
  background: var(--ui-badge-color);
}
</style>
