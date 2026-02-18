<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Toast from 'primevue/toast';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
import { mergePt } from './prime/pt';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    unstyled?: boolean;
    pt?: Record<string, unknown>;
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
const isUnstyled = computed(() => resolvePrimeUnstyled('uiToast', props.unstyled));

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-toast__root' },
      message: { class: 'ui-toast__message' },
      messageContent: { class: 'ui-toast__message-content' },
      messageIcon: { class: 'ui-toast__message-icon' },
      messageText: { class: 'ui-toast__message-text' },
      summary: { class: 'ui-toast__summary' },
      detail: { class: 'ui-toast__detail' },
      buttonContainer: { class: 'ui-toast__button-container' },
      closeButton: { class: 'ui-toast__close-button' },
      closeIcon: { class: 'ui-toast__close-icon' },
    } as Record<string, unknown>,
    props.pt
  )
);
</script>

<template>
  <Toast
    v-bind="attrs"
    class="ui-toast"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
    :unstyled="isUnstyled"
    :pt="mergedPt"
  />
</template>
