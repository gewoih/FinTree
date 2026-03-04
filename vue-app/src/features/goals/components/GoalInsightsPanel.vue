<script setup lang="ts">
defineProps<{ insights: string[] }>()
</script>

<template>
  <div
    v-if="insights.length > 0"
    class="insights-panel"
  >
    <p
      v-for="(insight, index) in insights"
      :key="index"
      class="insight-item"
    >
      <span class="insight-dot">·</span>
      {{ insight }}
    </p>
  </div>
</template>

<style scoped>
.insights-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
}

.insight-item {
  margin: 0;
  font-size: var(--ft-text-sm);
  line-height: 1.5;
  color: var(--ft-text-secondary);
}

.insight-dot {
  margin-right: var(--ft-space-2);
  font-weight: var(--ft-font-bold);
  color: var(--ft-primary-400);
}
</style>
