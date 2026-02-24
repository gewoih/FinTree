<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import AppShell from './components/layout/AppShell.vue';

const route = useRoute();
const isPublicRoute = computed(() => route.meta.public === true);
</script>

<template>
  <Toast
    position="top-right"
    append-to="body"
    :auto-z-index="true"
    :base-z-index="1060"
  />
  <ConfirmDialog append-to="body" />

  <AppShell v-if="!isPublicRoute">
    <router-view />
  </AppShell>

  <router-view v-else />
</template>

<style scoped>
/* Dialog */
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

:global(.p-dialog .p-dialog-content) {
  overflow: auto;
  background: var(--ft-surface-raised);
}

:global(.p-dialog .p-dialog-footer) {
  display: flex;
  gap: var(--ft-space-2);
  justify-content: flex-end;
}

/* Toast */
:global(.p-toast) {
  z-index: var(--ft-z-toast);

  display: grid;
  gap: var(--ft-space-2);

  width: min(420px, calc(100vw - (var(--ft-space-4) * 2)));
  min-width: min(420px, calc(100vw - (var(--ft-space-4) * 2)));
}

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
  margin-top: 0.125rem;
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

/* ConfirmDialog */
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
  margin-top: 0.125rem;
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
