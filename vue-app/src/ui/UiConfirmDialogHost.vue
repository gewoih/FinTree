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
