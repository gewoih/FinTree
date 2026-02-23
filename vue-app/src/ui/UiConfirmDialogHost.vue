<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import ConfirmDialog from 'primevue/confirmdialog';
import { mergePt } from './prime/pt';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    unstyled?: boolean;
    pt?: Record<string, unknown>;
  }>(),
  {
    unstyled: undefined,
    pt: undefined,
  }
);

const attrs = useAttrs();

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-confirm-dialog__root' },
      header: { class: 'ui-confirm-dialog__header' },
      title: { class: 'ui-confirm-dialog__title' },
      pcCloseButton: { root: { class: 'ui-confirm-dialog__close-button' } },
      content: { class: 'ui-confirm-dialog__content' },
      icon: { class: 'ui-confirm-dialog__icon' },
      message: { class: 'ui-confirm-dialog__message' },
      footer: { class: 'ui-confirm-dialog__footer' },
      pcRejectButton: { root: { class: 'p-button' } },
      pcAcceptButton: { root: { class: 'p-button' } },
    } as Record<string, unknown>,
    props.pt
  )
);
</script>

<template>
  <ConfirmDialog
    v-bind="attrs"
    class="ui-confirm-dialog"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
  />
</template>

<style scoped>
/* Root panel — teleported to body, shares mask with UiDialog */
:global(.ui-confirm-dialog__root),
:global(.p-confirm-dialog) {
  overflow: hidden;

  width: min(420px, calc(100vw - (var(--ft-space-4) * 2)));
  max-width: calc(100vw - (var(--ft-space-4) * 2));
  max-height: calc(100vh - (var(--ft-space-4) * 2));

  color: var(--ft-text-primary);

  background: var(--ft-surface-raised);
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);
  box-shadow: var(--ft-shadow-lg);
}

:global(.ui-confirm-dialog__header) {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-4) var(--ft-space-5);

  border-bottom: 1px solid var(--ft-border-soft);
}

:global(.ui-confirm-dialog__title) {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

:global(.ui-confirm-dialog__close-button) {
  cursor: pointer;

  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;

  width: 2rem;
  height: 2rem;

  color: var(--ft-text-secondary);

  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ft-radius-md);

  transition:
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    border-color var(--ft-transition-fast);
}

:global(.ui-confirm-dialog__close-button:hover) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-overlay);
  border-color: var(--ft-border-default);
}

:global(.ui-confirm-dialog__content) {
  overflow: auto;
  display: flex;
  gap: var(--ft-space-3);
  align-items: flex-start;

  padding: var(--ft-space-5);

  background: var(--ft-surface-raised);
}

:global(.ui-confirm-dialog__icon) {
  flex-shrink: 0;
  margin-top: 0.125rem;
  font-size: 1.125rem;
  color: var(--ft-text-secondary);
}

:global(.ui-confirm-dialog__message) {
  font-size: var(--ft-text-sm);
  line-height: var(--ft-leading-normal);
  color: var(--ft-text-secondary);
}

:global(.ui-confirm-dialog__footer) {
  display: flex;
  gap: var(--ft-space-2);
  justify-content: flex-end;

  padding: var(--ft-space-3) var(--ft-space-5) var(--ft-space-4);

  border-top: 1px solid var(--ft-border-soft);
}
</style>
