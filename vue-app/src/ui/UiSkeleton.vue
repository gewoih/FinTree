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

:deep(.ui-skeleton__root),
:deep(.p-skeleton) {
  background-image: linear-gradient(
    90deg,
    var(--ft-skeleton-shimmer-start) 0%,
    var(--ft-skeleton-shimmer-mid) 50%,
    var(--ft-skeleton-shimmer-end) 100%
  );
  background-size: 200% 100%;
  border-radius: var(--ft-radius-lg);
  animation: ui-skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes ui-skeleton-loading {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
