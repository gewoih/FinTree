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
  description: '',
  actionLabel: '',
  actionIcon: 'pi-plus'
})

// Don't destructure props to maintain reactivity
const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div
    class="empty-state"
    role="status"
  >
    <div class="empty-state__icon-wrapper">
      <i
        :class="['pi', props.icon, 'empty-state__icon']"
        aria-hidden="true"
      />
    </div>

    <h3 class="empty-state__title">
      {{ props.title }}
    </h3>

    <p
      v-if="props.description"
      class="empty-state__description"
    >
      {{ props.description }}
    </p>

    <UiButton
      v-if="props.actionLabel"
      :label="props.actionLabel"
      :icon="props.actionIcon"
      variant="primary"
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

  min-height: 400px;
  padding: var(--space-7) var(--space-6);

  text-align: center;
}

.empty-state__icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 80px;
  height: 80px;
  margin-bottom: var(--space-6);

  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 14%, transparent) 0%,
    color-mix(in srgb, var(--ft-success-400) 14%, transparent) 100%
  );
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.empty-state__icon {
  font-size: 2rem;
  color: var(--ft-text-tertiary);
}

.empty-state__title {
  margin: 0 0 var(--space-3);
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.empty-state__description {
  max-width: 420px;
  margin: 0 0 var(--space-6);

  font-size: var(--ft-text-base);
  line-height: var(--ft-leading-relaxed);
  color: var(--ft-text-secondary);
}

.empty-state__action {
  min-width: 180px;
}

/* Dark mode adjustments */
.dark-mode .empty-state__icon-wrapper {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 22%, transparent) 0%,
    color-mix(in srgb, var(--ft-success-400) 20%, transparent) 100%
  );
  border-color: var(--ft-border-default);
}
</style>
