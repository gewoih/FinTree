<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import ConfirmDialog from 'primevue/confirmdialog';
import type { ConfirmDialogPassThroughOptions } from 'primevue/confirmdialog';
import { mergePt } from './prime/pt';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    unstyled?: boolean;
    pt?: ConfirmDialogPassThroughOptions;
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
      pcRejectButton: { root: { class: 'ui-confirm-dialog__button ui-confirm-dialog__button--reject' } },
      pcAcceptButton: { root: { class: 'ui-confirm-dialog__button ui-confirm-dialog__button--accept' } },
    } as ConfirmDialogPassThroughOptions,
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
  margin-top: 0.125rem; /* sub-pixel nudge, no token exists at this scale */
  font-size: var(--ft-text-lg);
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

:global(.ui-confirm-dialog__button) {
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  height: var(--ft-control-height);
  padding: 0 var(--ft-space-4);

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);

  border: 1px solid transparent;
  border-radius: var(--ft-radius-lg);

  transition:
    background-color var(--ft-transition-fast),
    border-color var(--ft-transition-fast),
    color var(--ft-transition-fast);
}

:global(.ui-confirm-dialog__button--reject) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-overlay);
  border-color: var(--ft-border-default);
}

:global(.ui-confirm-dialog__button--reject:hover:not(:disabled)) {
  background: color-mix(in srgb, var(--ft-surface-overlay) 80%, var(--ft-surface-raised));
  border-color: var(--ft-border-strong);
}

:global(.ui-confirm-dialog__button--accept) {
  color: var(--ft-text-inverse);
  background: var(--ft-danger-500);
  border-color: var(--ft-danger-500);
}

:global(.ui-confirm-dialog__button--accept:hover:not(:disabled)) {
  background: color-mix(in srgb, var(--ft-danger-500) 85%, black);
  border-color: color-mix(in srgb, var(--ft-danger-500) 85%, black);
}

:global(.ui-confirm-dialog__button:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
