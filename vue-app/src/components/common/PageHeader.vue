<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
}

defineProps<Props>()
</script>

<template>
  <header class="page-title-bar">
    <div class="page-title-bar__text">
      <h1 class="page-title-bar__title">
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="page-title-bar__subtitle"
      >
        {{ subtitle }}
      </p>
    </div>

    <div
      v-if="$slots.actions"
      class="page-title-bar__actions"
    >
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-title-bar {
  display: flex;
  gap: var(--ft-space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.page-title-bar__text {
  min-width: 0;
}

.page-title-bar__title {
  margin: 0;
  font-size: var(--ft-text-2xl);
  font-weight: var(--ft-font-bold);
  line-height: var(--ft-leading-tight);
  color: var(--ft-text-primary);
}

.page-title-bar__subtitle {
  margin: var(--ft-space-2) 0 0;
  font-size: var(--ft-text-base);
  color: var(--ft-text-secondary);
}

.page-title-bar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: flex-end;
}

@media (width <= 768px) {
  .page-title-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .page-title-bar__title {
    font-size: var(--ft-text-xl);
  }

  .page-title-bar__subtitle {
    font-size: var(--ft-text-sm);
  }

  .page-title-bar__actions {
    justify-content: flex-start;
  }

  .page-title-bar__actions :deep(.ui-button) {
    flex: 1 1 auto;
    min-width: 140px;
  }
}
</style>
