<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  breadcrumbs?: Array<{ label: string; to?: string }>
}

defineProps<Props>()
</script>

<template>
  <div class="page-header">
    <div
      v-if="breadcrumbs && breadcrumbs.length"
      class="page-header__breadcrumbs"
    >
      <template
        v-for="(crumb, index) in breadcrumbs"
        :key="index"
      >
        <router-link
          v-if="crumb.to"
          :to="crumb.to"
          class="page-header__breadcrumb-link"
        >
          {{ crumb.label }}
        </router-link>
        <span
          v-else
          class="page-header__breadcrumb-current"
        >
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
        <h1 class="page-header__title">
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="page-header__subtitle"
        >
          {{ subtitle }}
        </p>
      </div>

      <div
        v-if="$slots.actions"
        class="page-header__actions"
      >
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);

  margin-bottom: 0;
  padding-bottom: var(--ft-space-6);

  border-bottom: 1px solid var(--ft-border-default);
}

.page-header__breadcrumbs {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  font-size: var(--ft-text-sm);
}

.page-header__breadcrumb-link {
  color: var(--ft-text-secondary);
  text-decoration: none;
  transition: color var(--ft-transition-fast);
}

.page-header__breadcrumb-link:hover {
  color: var(--ft-primary-500);
}

.page-header__breadcrumb-current {
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.page-header__breadcrumb-separator {
  font-size: 0.75rem;
  color: var(--ft-text-secondary);
}

.page-header__main {
  display: flex;
  gap: var(--ft-space-8);
  align-items: center;
  justify-content: space-between;
}

.page-header__text {
  flex: 1;
}

.page-header__title {
  margin: 0;

  font-size: var(--ft-text-3xl);
  font-weight: var(--ft-font-bold);
  line-height: var(--ft-leading-tight);
  color: var(--ft-text-primary);
}

.page-header__subtitle {
  margin: var(--ft-space-2) 0 0;
  font-size: var(--ft-text-base);
  line-height: var(--ft-leading-normal);
  color: var(--ft-text-secondary);
}

.page-header__actions {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

/* Responsive */
@media (width <= 768px) {
  .page-header__breadcrumbs {
    display: none;
  }

  .page-header__main {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header__title {
    font-size: var(--ft-text-2xl);
  }

  .page-header__subtitle {
    font-size: var(--ft-text-sm);
  }

  .page-header__actions {
    flex-wrap: wrap;
    width: 100%;
  }

  .page-header__actions :deep(button) {
    flex: 1 1 auto;
    min-width: 140px;
  }
}

@media (width <= 640px) {
  .page-header__subtitle {
    display: none;
  }
}
</style>
