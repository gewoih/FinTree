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
      <RouterLink class="brand" to="/">
        <span class="brand__icon">
          <i class="pi pi-tree" />
        </span>
        <span>
          <strong>FinTree</strong>
          <small>управление личными финансами</small>
        </span>
      </RouterLink>

      <nav class="app-nav">
        <RouterLink
          v-for="item in NAVIGATION_ITEMS"
          :key="item.id"
          :to="item.route"
          class="nav-link"
          :class="{ active: activeRouteId === item.id }"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <Button
        label="Добавить расход"
        icon="pi pi-plus"
        severity="success"
        size="small"
        @click="$router.push({ name: 'expenses' })"
      />
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.app-header {
  position: sticky;
  top: 18px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 1.5rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-decoration: none;
  color: inherit;
}

.brand strong {
  font-size: 1.25rem;
  color: var(--ft-heading);
}

.brand small {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--ft-text-muted);
}

.brand__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(59, 130, 246, 0.12));
  display: grid;
  place-items: center;
  color: var(--ft-accent);
  font-size: 1.3rem;
}

.app-nav {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  color: var(--ft-text-muted);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.nav-link:hover {
  border-color: rgba(37, 99, 235, 0.2);
  color: var(--ft-heading);
}

.nav-link.active {
  background: var(--ft-accent-soft);
  color: var(--ft-heading);
  border-color: transparent;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.2);
}

.app-main {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .app-nav {
    justify-content: center;
  }
}
</style>
