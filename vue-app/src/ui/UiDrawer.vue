<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Drawer from 'primevue/drawer';
import type { DrawerPassThroughOptions } from 'primevue/drawer';
import { mergePt } from './prime/pt';

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

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-drawer__root' },
      header: { class: 'ui-drawer__header' },
      content: { class: 'ui-drawer__content' },
      mask: { class: 'ui-drawer__mask' },
    } as DrawerPassThroughOptions,
    props.pt
  )
);
</script>

<template>
  <Drawer
    v-bind="attrs"
    class="ui-drawer"
    :visible="props.visible"
    :unstyled="props.unstyled ?? true"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
    :pt="mergedPt"
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
:global(.ui-drawer__mask),
:global(.p-drawer-mask) {
  position: fixed;
  z-index: var(--ft-z-drawer);
  inset: 0;

  background: var(--ft-bg-overlay);
  backdrop-filter: blur(2px);
}

:global(.ui-drawer__root),
:global(.p-drawer) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-raised);
  border-inline-end: 1px solid var(--ft-border-default);
  box-shadow: var(--ft-shadow-lg);
}

:global(.ui-drawer__content),
:global(.p-drawer .p-drawer-content) {
  padding: 0;
}
</style>
