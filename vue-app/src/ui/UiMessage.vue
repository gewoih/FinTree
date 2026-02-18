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
