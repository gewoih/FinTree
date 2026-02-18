<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Drawer from 'primevue/drawer';
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
  }>(),
  {
    unstyled: undefined,
    pt: undefined,
    autoZIndex: true,
    baseZIndex: 0,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
}>();

const attrs = useAttrs();
const isUnstyled = computed(() => resolvePrimeUnstyled('uiDrawer', props.unstyled));

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-drawer__root' },
      header: { class: 'ui-drawer__header' },
      content: { class: 'ui-drawer__content' },
      mask: { class: 'ui-drawer__mask' },
    } as Record<string, unknown>,
    props.pt
  )
);
</script>

<template>
  <Drawer
    v-bind="attrs"
    class="ui-drawer"
    :visible="props.visible"
    :unstyled="isUnstyled"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
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
  </Drawer>
</template>
