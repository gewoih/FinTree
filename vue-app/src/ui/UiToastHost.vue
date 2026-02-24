<script setup lang="ts">
import { useAttrs } from 'vue';
import Toast from 'primevue/toast';
import type { ToastPassThroughOptions } from 'primevue/toast';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    unstyled?: boolean;
    pt?: ToastPassThroughOptions;
    autoZIndex?: boolean;
    baseZIndex?: number;
  }>(),
  {
    unstyled: undefined,
    pt: undefined,
    autoZIndex: true,
    baseZIndex: 1060,
  }
);

const attrs = useAttrs();
</script>

<template>
  <Toast
    v-bind="attrs"
    class="ui-toast"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
    :unstyled="props.unstyled"
    :pt="props.pt"
  />
</template>

<style scoped>
/* Toast is a fixed overlay teleported outside the component tree — all rules use :global() */

:global(.p-toast) {
  z-index: var(--ft-z-toast);

  display: grid;
  gap: var(--ft-space-2);

  width: min(420px, calc(100vw - (var(--ft-space-4) * 2)));
  min-width: min(420px, calc(100vw - (var(--ft-space-4) * 2)));
}

/* Individual message card — shares the overlay-card appearance */
:global(.p-toast-message) {
  color: var(--ft-text-primary);

  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ft-surface-overlay) 92%, transparent) 0%,
    var(--ft-surface-raised) 100%
  );
  border: 1px solid color-mix(in srgb, var(--ft-border-default) 88%, var(--ft-border-strong));
  border-radius: var(--ft-radius-lg);
  box-shadow:
    0 18px 32px color-mix(in srgb, var(--ft-bg-base) 60%, transparent),
    0 2px 8px color-mix(in srgb, var(--ft-bg-base) 32%, transparent);
}

:global(.p-toast .p-toast-message) {
  overflow: hidden;
  padding: var(--ft-space-3);
  border-inline-start: 3px solid var(--ft-border-default);
}

:global(.p-toast .p-toast-message.p-toast-message-success) {
  border-inline-start-color: var(--ft-success-500);
}

:global(.p-toast .p-toast-message.p-toast-message-info) {
  border-inline-start-color: var(--ft-info-500);
}

:global(.p-toast .p-toast-message.p-toast-message-warn) {
  border-inline-start-color: var(--ft-warning-500);
}

:global(.p-toast .p-toast-message.p-toast-message-error) {
  border-inline-start-color: var(--ft-danger-500);
}

:global(.p-toast .p-toast-message-content) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--ft-space-2);
  align-items: flex-start;
}

:global(.p-toast .p-toast-message-icon) {
  margin-top: 0.125rem; /* sub-pixel nudge, no token exists at this scale */
  font-size: var(--ft-text-base);
  color: var(--ft-text-secondary);
}

:global(.p-toast .p-toast-message-text) {
  display: grid;
  gap: var(--ft-space-1);
  min-width: 0;
}

:global(.p-toast .p-toast-summary) {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  line-height: var(--ft-leading-tight);
}

:global(.p-toast .p-toast-detail) {
  margin: 0;
  font-size: var(--ft-text-sm);
  line-height: var(--ft-leading-normal);
  color: var(--ft-text-secondary);
}

:global(.p-toast .p-toast-button-container) {
  align-self: flex-start;
}

:global(.p-toast .p-toast-close-button) {
  cursor: pointer;

  display: inline-flex;
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

:global(.p-toast .p-toast-close-button:hover) {
  color: var(--ft-text-primary);
  background: var(--ft-surface-overlay);
  border-color: var(--ft-border-default);
}

:global(.p-toast .p-toast-close-icon) {
  width: 1rem;
  height: 1rem;
}
</style>
