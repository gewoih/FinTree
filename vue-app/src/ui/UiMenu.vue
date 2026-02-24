<script setup lang="ts">
import { ref, useAttrs } from 'vue';
import Menu from 'primevue/menu';
import type { MenuPassThroughOptions } from 'primevue/menu';
import type { MenuItem } from 'primevue/menuitem';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    model?: MenuItem[];
    popup?: boolean;
    unstyled?: boolean;
    pt?: MenuPassThroughOptions;
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
    :unstyled="props.unstyled"
    :pt="props.pt"
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

<style scoped>
:global(.p-menu) {
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

:global(.p-menu-list)::-webkit-scrollbar {
  width: var(--ft-scrollbar-size);
  height: var(--ft-scrollbar-size);
}

:global(.p-menu-list)::-webkit-scrollbar-track {
  background: var(--ft-scrollbar-track);
  border-radius: var(--ft-radius-full);
}

:global(.p-menu-list)::-webkit-scrollbar-thumb {
  background: var(--ft-scrollbar-thumb);
  border: 2px solid var(--ft-scrollbar-track);
  border-radius: var(--ft-radius-full);
}

:global(.p-menu-list)::-webkit-scrollbar-thumb:hover {
  background: var(--ft-scrollbar-thumb-hover);
}

:global(.p-menu-list)::-webkit-scrollbar-thumb:active {
  background: var(--ft-scrollbar-thumb-active);
}

:global(.p-menu-list),
:global(.p-menu-item),
:global(.p-menu-item-content) {
  margin: 0;
  padding: 0;
  list-style: none;
  background: transparent;
}

:global(.p-menu-item-link) {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  padding: var(--ft-space-2) var(--ft-space-3);

  color: var(--ft-text-primary);

  border-radius: var(--ft-radius-md);
}

:global(.p-menu-item-link:hover),
:global(.p-menu-item-content:hover) {
  background: color-mix(in srgb, var(--ft-primary-400) 12%, transparent);
}
</style>
