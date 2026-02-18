<script setup lang="ts">
import { computed } from 'vue';
import Skeleton from 'primevue/skeleton';
import type { SkeletonPassThroughOptions } from 'primevue/skeleton';
import { mergePt } from './prime/pt';

const props = defineProps<{
  height?: string;
  width?: string;
  borderRadius?: string;
  unstyled?: boolean;
  pt?: SkeletonPassThroughOptions;
}>();


const mergedPt = computed(() =>
  mergePt(
    {
      root: {
        class: 'ui-skeleton__root',
      },
    } as SkeletonPassThroughOptions,
    props.pt
  )
);
</script>

<template>
  <Skeleton
    class="ui-skeleton"
    role="status"
    aria-busy="true"
    :height="props.height"
    :width="props.width"
    :border-radius="props.borderRadius"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
  />
</template>

<style scoped>
.ui-skeleton {
  border-radius: var(--ft-radius-lg);
}
</style>
