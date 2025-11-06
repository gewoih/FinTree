<script setup lang="ts">
interface Props {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  actionIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'pi-inbox',
  actionIcon: 'pi-plus'
})

// Don't destructure props to maintain reactivity
const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="empty-state" role="status">
    <div class="empty-state__icon-wrapper">
      <i :class="['pi', props.icon, 'empty-state__icon']" aria-hidden="true" />
    </div>

    <h3 class="empty-state__title">{{ props.title }}</h3>

    <p v-if="props.description" class="empty-state__description">
      {{ props.description }}
    </p>

    <Button
      v-if="props.actionLabel"
      :label="props.actionLabel"
      :icon="props.actionIcon"
      severity="primary"
      class="empty-state__action"
      @click="emit('action')"
    />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--ft-space-16) var(--ft-space-8);
  text-align: center;
  min-height: 400px;
}

.empty-state__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: var(--ft-space-6);
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(34, 197, 94, 0.1) 100%
  );
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-subtle);
}

.empty-state__icon {
  font-size: 2rem;
  color: var(--ft-text-tertiary);
}

.empty-state__title {
  margin: 0 0 var(--ft-space-3);
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.empty-state__description {
  margin: 0 0 var(--ft-space-8);
  max-width: 420px;
  font-size: var(--ft-text-base);
  color: var(--ft-text-secondary);
  line-height: var(--ft-leading-relaxed);
}

.empty-state__action {
  min-width: 180px;
}

/* Dark mode adjustments */
.dark-mode .empty-state__icon-wrapper {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.15) 0%,
    rgba(34, 197, 94, 0.15) 100%
  );
  border-color: var(--ft-border-default);
}
</style>
