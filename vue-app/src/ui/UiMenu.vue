<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue';
import Menu from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
import { mergePt } from './prime/pt';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    model?: MenuItem[];
    popup?: boolean;
    unstyled?: boolean;
    pt?: Record<string, unknown>;
    appendTo?: string | HTMLElement;
    autoZIndex?: boolean;
    baseZIndex?: number;
  }>(),
  {
    model: () => [],
    popup: false,
    unstyled: undefined,
    pt: undefined,
    appendTo: 'body',
    autoZIndex: true,
    baseZIndex: 0,
  }
);

const attrs = useAttrs();
const menuRef = ref<InstanceType<typeof Menu> | null>(null);
const isUnstyled = computed(() => resolvePrimeUnstyled('uiMenu', props.unstyled));

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-menu__root' },
      list: { class: 'ui-menu__list' },
      item: { class: 'ui-menu__item' },
      itemContent: { class: 'ui-menu__item-content' },
      itemLink: { class: 'ui-menu__item-link' },
    } as Record<string, unknown>,
    props.pt
  )
);

const toggle = (event: Event) => {
  menuRef.value?.toggle(event);
};

const show = (event: Event) => {
  menuRef.value?.show(event);
};

const hide = () => {
  menuRef.value?.hide();
};

defineExpose({
  toggle,
  show,
  hide,
});
</script>

<template>
  <Menu
    ref="menuRef"
    v-bind="attrs"
    class="ui-menu"
    :model="props.model"
    :popup="props.popup"
    :append-to="props.appendTo"
    :auto-z-index="props.autoZIndex"
    :base-z-index="props.baseZIndex"
    :unstyled="isUnstyled"
    :pt="mergedPt"
  >
    <template
      v-if="$slots.start"
      #start
    >
      <slot name="start" />
    </template>

    <template
      v-if="$slots.item"
      #item="slotProps"
    >
      <slot
        name="item"
        v-bind="slotProps"
      />
    </template>

    <template
      v-if="$slots.end"
      #end
    >
      <slot name="end" />
    </template>
  </Menu>
</template>
