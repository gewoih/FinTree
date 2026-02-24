<script setup lang="ts">
import { useAttrs } from 'vue';
import Drawer from 'primevue/drawer';
import type { DrawerPassThroughOptions } from 'primevue/drawer';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    visible: boolean;
    unstyled?: boolean;
    pt?: DrawerPassThroughOptions;
    autoZIndex?: boolean;
    baseZIndex?: number;
  }>(),
  {
    unstyled: undefined,
    pt: undefined,
    autoZIndex: true,
    baseZIndex: 0,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
}>();

const attrs = useAttrs();
</script>

<template>
  <Drawer
    v-bind="attrs"
    class="ui-drawer"
    :visible="props.visible"
    :unstyled="props.unstyled"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
    :pt="props.pt"
    @update:visible="value => emit('update:visible', value)"
  >
    <template
      v-if="$slots.header"
      #header
    >
      <slot name="header" />
    </template>

    <slot />

    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </Drawer>
</template>

<style scoped>
:global(.p-drawer-mask) {
  position: fixed;
  z-index: var(--ft-z-drawer);
  inset: 0;

  background: var(--ft-bg-overlay);
  backdrop-filter: blur(2px);
}

:global(.p-drawer) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-raised);
  border-inline-end: 1px solid var(--ft-border-default);
  box-shadow: var(--ft-shadow-lg);
}

:global(.p-drawer .p-drawer-content) {
  padding: 0;
}
</style>
