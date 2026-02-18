<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import ConfirmDialog from 'primevue/confirmdialog';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
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
const isUnstyled = computed(() => resolvePrimeUnstyled('uiConfirmDialog', props.unstyled));

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-confirm-dialog__root' },
      content: { class: 'ui-confirm-dialog__content' },
      footer: { class: 'ui-confirm-dialog__footer' },
      message: { class: 'ui-confirm-dialog__message' },
    } as Record<string, unknown>,
    props.pt
  )
);
</script>

<template>
  <ConfirmDialog
    v-bind="attrs"
    class="ui-confirm-dialog"
    :unstyled="isUnstyled"
    :pt="mergedPt"
  />
</template>
