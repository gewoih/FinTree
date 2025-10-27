<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import Button from 'primevue/button';
import { NAVIGATION_ITEMS } from './constants';
import { useFinanceStore } from './stores/finance';

const route = useRoute();
const store = useFinanceStore();

const activeRouteId = computed(() => (typeof route.name === 'string' ? route.name : route.name?.toString() ?? ''));

onMounted(() => {
  store.fetchInitialData();
});
</script>

<template>
  <div class="app">
    <Toast />
    <ConfirmDialog />

    <header class="app-header">
      <div class="header-inner">
        <RouterLink class="brand" to="/">
          <span class="brand__icon">
            <i class="pi pi-tree" />
          </span>
          <span class="brand__text">
            <strong>FinTree</strong>
            <small>управление личными финансами</small>
          </span>
        </RouterLink>

        <nav class="app-nav" aria-label="Основная навигация">
          <RouterLink
            v-for="item in NAVIGATION_ITEMS"
            :key="item.id"
            :to="item.route"
            class="nav-link"
            :class="{ active: activeRouteId === item.id }"
          >
            <i :class="item.icon" class="nav-link__icon" />
            <span class="nav-link__label">{{ item.label }}</span>
          </RouterLink>
        </nav>

        <Button
          label="Добавить расход"
          icon="pi pi-plus"
          severity="success"
          size="small"
          @click="$router.push({ name: 'expenses' })"
        />
      </div>
    </header>

    <main class="app-main">
      <div class="app-shell">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(16px);
  background: linear-gradient(180deg, rgba(8, 15, 34, 0.92), rgba(8, 15, 34, 0.78));
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

.header-inner {
  width: min(1280px, 100% - clamp(1.5rem, 4vw, 4rem));
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(1rem, 2vw, 1.75rem);
  padding: clamp(1rem, 1.8vw, 1.4rem) 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;
  text-decoration: none;
  color: inherit;
}

.brand__icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(125, 211, 252, 0.12));
  display: grid;
  place-items: center;
  color: var(--ft-accent);
  font-size: 1.2rem;
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.24);
}

.brand__text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.brand__text strong {
  font-size: 1.2rem;
  letter-spacing: 0.02em;
  color: var(--ft-heading);
}

.brand__text small {
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ft-text-muted);
}

.app-nav {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.48rem 1rem;
  border-radius: 999px;
  color: var(--ft-text-muted);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.nav-link__icon {
  font-size: 0.95rem;
}

.nav-link:hover {
  border-color: rgba(56, 189, 248, 0.32);
  color: var(--ft-heading);
}

.nav-link.active {
  background: var(--ft-accent-soft);
  color: var(--ft-heading);
  border-color: transparent;
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.32);
}

.app-main {
  flex: 1;
  display: flex;
  padding-bottom: clamp(2.5rem, 4vw, 4rem);
}

.app-shell {
  width: min(1280px, 100% - clamp(1.5rem, 4vw, 4rem));
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(2rem, 3vw, 3.25rem);
  padding-top: clamp(2rem, 3vw, 3.5rem);
}

@media (max-width: 768px) {
  .header-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .app-nav {
    justify-content: center;
  }
}
</style>
