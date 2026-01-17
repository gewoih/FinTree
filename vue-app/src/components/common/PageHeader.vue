<script setup lang="ts">
interface Props {
  title: string
  description?: string
  breadcrumbs?: Array<{ label: string; to?: string }>
}

defineProps<Props>()
</script>

<template>
  <header class="page-header">
    <div v-if="breadcrumbs && breadcrumbs.length" class="page-header__breadcrumbs">
      <template v-for="(crumb, index) in breadcrumbs" :key="index">
        <router-link
          v-if="crumb.to"
          :to="crumb.to"
          class="page-header__breadcrumb-link"
        >
          {{ crumb.label }}
        </router-link>
        <span v-else class="page-header__breadcrumb-current">
          {{ crumb.label }}
        </span>
        <i
          v-if="index < breadcrumbs.length - 1"
          class="pi pi-chevron-right page-header__breadcrumb-separator"
        />
      </template>
    </div>

    <div class="page-header__main">
      <div class="page-header__text">
        <h1 class="page-header__title">{{ title }}</h1>
        <p v-if="description" class="page-header__description">{{ description }}</p>
      </div>

      <div v-if="$slots.actions" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.page-header__breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.85rem;
}

.page-header__breadcrumb-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color var(--ft-transition-fast);
}

.page-header__breadcrumb-link:hover {
  color: var(--accent);
}

.page-header__breadcrumb-current {
  color: var(--text);
  font-weight: var(--ft-font-medium);
}

.page-header__breadcrumb-separator {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.page-header__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
}

.page-header__text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.page-header__title {
  margin: 0;
  font-size: clamp(1.75rem, 2.5vw, 2.25rem);
  font-weight: var(--ft-font-bold);
  color: var(--text);
  line-height: var(--ft-leading-tight);
}

.page-header__description {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: var(--ft-leading-normal);
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

@media (max-width: 768px) {
  .page-header__main {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header__actions {
    width: 100%;
  }

  .page-header__actions :deep(button) {
    flex: 1;
  }
}
</style>
