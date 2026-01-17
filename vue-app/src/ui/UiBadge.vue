<script setup lang="ts">
import Tag from 'primevue/tag'

const props = defineProps<{
  value?: string | number
  severity?: 'success' | 'info' | 'warning' | 'danger' | 'secondary'
}>
</script>

<template>
  <Tag class="ui-badge" :value="props.value" :severity="props.severity">
    <slot />
  </Tag>
</template>

<style scoped>
.ui-badge {
  border-radius: 999px;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
}
</style>
