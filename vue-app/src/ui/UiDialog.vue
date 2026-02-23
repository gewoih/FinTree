<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Dialog from 'primevue/dialog';
import type { DialogPassThroughOptions } from 'primevue/dialog';
import { mergePt } from './prime/pt';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    visible: boolean;
    unstyled?: boolean;
    pt?: DialogPassThroughOptions;
    autoZIndex?: boolean;
    baseZIndex?: number;
    appendTo?: string | HTMLElement;
  }>(),
  {
    unstyled: undefined,
    pt: undefined,
    autoZIndex: true,
    baseZIndex: 0,
    appendTo: 'body',
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
}>();

const attrs = useAttrs();

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-dialog__root' },
      content: { class: 'ui-dialog__content' },
      header: { class: 'ui-dialog__header' },
      footer: { class: 'ui-dialog__footer' },
      mask: { class: 'ui-dialog__mask' },
    } as DialogPassThroughOptions,
    props.pt
  )
);
</script>

<template>
  <Dialog
    v-bind="attrs"
    class="ui-dialog"
    :visible="props.visible"
    :unstyled="props.unstyled ?? true"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
    :append-to="props.appendTo"
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
  </Dialog>
</template>

<style scoped>
/* Mask / backdrop — teleported to body */
:global(.ui-dialog__mask),
:global(.p-dialog-mask) {
  position: fixed;
  z-index: var(--ft-z-modal);
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: var(--ft-space-4);

  background: var(--ft-bg-overlay);
  backdrop-filter: blur(2px);
}

/* Dialog panel — teleported to body */
:global(.ui-dialog__root),
:global(.p-dialog) {
  overflow: hidden;

  max-width: calc(100vw - (var(--ft-space-4) * 2));
  max-height: calc(100vh - (var(--ft-space-4) * 2));

  color: var(--ft-text-primary);

  background: var(--ft-surface-raised);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);
  box-shadow: var(--ft-shadow-lg);
}

/* Content area */
:global(.ui-dialog__content),
:global(.p-dialog .p-dialog-content) {
  overflow: auto;
  background: var(--ft-surface-raised);
}

/* Footer */
:global(.ui-dialog__footer),
:global(.p-dialog .p-dialog-footer) {
  display: flex;
  gap: var(--ft-space-2);
  justify-content: flex-end;
}

/* Responsive — full-width sheet on mobile */

/* TODO: !important required to override PrimeVue inline style on .p-dialog at mobile breakpoint */
@media (width <= 640px) {
  :global(.p-dialog) {
    width: 100vw !important;
    max-width: 100vw !important;
    max-height: 95vh;
    margin: 0;

    border-radius: var(--ft-radius-lg);
  }

  :global(.p-dialog .p-dialog-footer) {
    padding: var(--ft-space-3) var(--ft-space-4) var(--ft-space-4);
  }
}
</style>
