<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Dialog from 'primevue/dialog';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
import { mergePt } from './prime/pt';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    visible: boolean;
    unstyled?: boolean;
    pt?: Record<string, unknown>;
    autoZIndex?: boolean;
    baseZIndex?: number;
    appendTo?: string | HTMLElement;
  }>(),
  {
    unstyled: undefined,
    pt: undefined,
    autoZIndex: true,
    baseZIndex: 1040,
    appendTo: 'body',
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
}>();

const attrs = useAttrs();
const isUnstyled = computed(() => resolvePrimeUnstyled('uiDialog', props.unstyled));

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-dialog__root' },
      content: { class: 'ui-dialog__content' },
      header: { class: 'ui-dialog__header' },
      footer: { class: 'ui-dialog__footer' },
      mask: { class: 'ui-dialog__mask' },
    } as Record<string, unknown>,
    props.pt
  )
);
</script>

<template>
  <Dialog
    v-bind="attrs"
    class="ui-dialog"
    :visible="props.visible"
    :unstyled="isUnstyled"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
    :append-to="props.appendTo"
    :pt="mergedPt"
    @update:visible="value => emit('update:visible', value)"
  >
    <template
      v-if="$slots.header"
      #header
    >
      <slot name="header" />
    </template>

    <slot />

    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </Dialog>
</template>
