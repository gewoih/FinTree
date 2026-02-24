<script setup lang="ts">
import { useAttrs } from 'vue';
import ConfirmDialog from 'primevue/confirmdialog';
import type { ConfirmDialogPassThroughOptions } from 'primevue/confirmdialog';

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
</script>

<template>
  <ConfirmDialog
    v-bind="attrs"
    class="ui-confirm-dialog"
    :unstyled="props.unstyled"
    :pt="props.pt"
  />
</template>

<style scoped>
/* Root panel — teleported to body, shares mask with UiDialog */
:global(.p-confirmdialog),
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

:global(.p-confirmdialog .p-dialog-header),
:global(.p-confirm-dialog .p-dialog-header) {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-4) var(--ft-space-5);

  border-bottom: 1px solid var(--ft-border-soft);
}

:global(.p-confirmdialog .p-dialog-title),
:global(.p-confirm-dialog .p-dialog-title) {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

:global(.p-confirmdialog .p-dialog-close-button),
:global(.p-confirm-dialog .p-dialog-close-button) {
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

:global(.p-confirmdialog .p-dialog-close-button:hover),
:global(.p-confirm-dialog .p-dialog-close-button:hover) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-overlay);
  border-color: var(--ft-border-default);
}

:global(.p-confirmdialog .p-dialog-content),
:global(.p-confirm-dialog .p-dialog-content) {
  overflow: auto;
  display: flex;
  gap: var(--ft-space-3);
  align-items: flex-start;

  padding: var(--ft-space-5);

  background: var(--ft-surface-raised);
}

:global(.p-confirmdialog .p-confirmdialog-icon),
:global(.p-confirm-dialog .p-confirm-dialog-icon) {
  flex-shrink: 0;
  margin-top: 0.125rem; /* sub-pixel nudge, no token exists at this scale */
  font-size: var(--ft-text-lg);
  color: var(--ft-text-secondary);
}

:global(.p-confirmdialog .p-confirmdialog-message),
:global(.p-confirm-dialog .p-confirm-dialog-message) {
  font-size: var(--ft-text-sm);
  line-height: var(--ft-leading-normal);
  color: var(--ft-text-secondary);
}

:global(.p-confirmdialog .p-dialog-footer),
:global(.p-confirm-dialog .p-dialog-footer) {
  display: flex;
  gap: var(--ft-space-2);
  justify-content: flex-end;

  padding: var(--ft-space-3) var(--ft-space-5) var(--ft-space-4);

  border-top: 1px solid var(--ft-border-soft);
}

:global(.p-confirmdialog .p-dialog-footer .p-button),
:global(.p-confirm-dialog .p-dialog-footer .p-button) {
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

:global(.p-confirmdialog .p-confirmdialog-reject-button),
:global(.p-confirm-dialog .p-confirm-dialog-reject) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-overlay);
  border-color: var(--ft-border-default);
}

:global(.p-confirmdialog .p-confirmdialog-reject-button:hover:not(:disabled)),
:global(.p-confirm-dialog .p-confirm-dialog-reject:hover:not(:disabled)) {
  background: color-mix(in srgb, var(--ft-surface-overlay) 80%, var(--ft-surface-raised));
  border-color: var(--ft-border-strong);
}

:global(.p-confirmdialog .p-confirmdialog-accept-button),
:global(.p-confirm-dialog .p-confirm-dialog-accept) {
  color: var(--ft-text-inverse);
  background: var(--ft-danger-500);
  border-color: var(--ft-danger-500);
}

:global(.p-confirmdialog .p-confirmdialog-accept-button:hover:not(:disabled)),
:global(.p-confirm-dialog .p-confirm-dialog-accept:hover:not(:disabled)) {
  background: color-mix(in srgb, var(--ft-danger-500) 85%, black);
  border-color: color-mix(in srgb, var(--ft-danger-500) 85%, black);
}

:global(.p-confirmdialog .p-dialog-footer .p-button:disabled),
:global(.p-confirm-dialog .p-dialog-footer .p-button:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
