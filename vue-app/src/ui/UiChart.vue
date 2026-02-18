<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import Chart from 'primevue/chart';
import { mergePt } from './prime/pt';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    type?: string;
    data?: object;
    options?: object;
    plugins?: object[];
    unstyled?: boolean;
    pt?: Record<string, unknown>;
  }>(),
  {
    type: 'line',
    data: undefined,
    options: undefined,
    plugins: () => [],
    unstyled: undefined,
    pt: undefined,
  }
);

const attrs = useAttrs();

const mergedPt = computed(() =>
  mergePt(
    {
      root: { class: 'ui-chart__root p-chart' },
      canvas: { class: 'ui-chart__canvas' },
    } as Record<string, unknown>,
    props.pt
  )
);
</script>

<template>
  <Chart
    v-bind="attrs"
    class="ui-chart"
    :type="props.type"
    :data="props.data"
    :options="props.options"
    :plugins="props.plugins"
    :unstyled="props.unstyled ?? true"
    :pt="mergedPt"
  />
</template>
