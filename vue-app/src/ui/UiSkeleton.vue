<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

const props = defineProps<{
  height?: string;
  width?: string;
  borderRadius?: string;
}>();
</script>

<template>
  <Skeleton
    class="ui-skeleton"
    :height="props.height"
    :width="props.width"
    :border-radius="props.borderRadius"
  />
</template>

<style scoped>
.ui-skeleton {
  border-radius: var(--radius-md);
}
</style>
