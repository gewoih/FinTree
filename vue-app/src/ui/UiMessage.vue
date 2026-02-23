<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Message from 'primevue/message';
import { mergePt } from './prime/pt';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    severity?: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';
    icon?: string;
    closable?: boolean;
    life?: number;
    sticky?: boolean;
    unstyled?: boolean;
    pt?: Record<string, unknown>;
  }>(),
  {
    severity: 'info',
    icon: undefined,
    closable: false,
    life: undefined,
    sticky: undefined,
    unstyled: undefined,
    pt: undefined,
  }
);

const attrs = useAttrs();

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-message__root' },
      content: { class: 'ui-message__content' },
      text: { class: 'ui-message__text' },
      icon: { class: 'ui-message__icon' },
      closeButton: { class: 'ui-message__close' },
    } as Record<string, unknown>,
    props.pt
  )
);
</script>

<template>
  <Message
    v-bind="attrs"
    class="ui-message"
    :severity="props.severity"
    :icon="props.icon"
    :closable="props.closable"
    :life="props.life"
    :sticky="props.sticky"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
  >
    <slot />
  </Message>
</template>

<style scoped>
:deep(.ui-message__root),
:deep(.p-message) {
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

:deep(.p-message) {
  padding: var(--ft-space-3);
}

:deep(.p-message.p-message-error) {
  border-color: color-mix(in srgb, var(--ft-danger-500) 35%, transparent);
}

:deep(.p-message.p-message-info) {
  border-color: color-mix(in srgb, var(--ft-info-500) 35%, transparent);
}
</style>
