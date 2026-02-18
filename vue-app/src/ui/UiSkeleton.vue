<script setup lang="ts">
import { computed } from 'vue';
import Skeleton from 'primevue/skeleton';
import type { SkeletonPassThroughOptions } from 'primevue/skeleton';
import { resolvePrimeUnstyled } from '../config/primevue-unstyled-flags';
import { mergePt } from './prime/pt';

const props = defineProps<{
  height?: string;
  width?: string;
  borderRadius?: string;
  unstyled?: boolean;
  pt?: SkeletonPassThroughOptions;
}>();

const isUnstyled = computed(() => resolvePrimeUnstyled('uiSkeleton', props.unstyled));

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
    :unstyled="isUnstyled"
    :pt="mergedPt"
  />
</template>

<style scoped>
.ui-skeleton {
  border-radius: var(--ft-radius-lg);
}
</style>
