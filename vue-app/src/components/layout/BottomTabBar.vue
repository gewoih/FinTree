<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { label: 'Главная', icon: 'pi-home', to: '/analytics' },
  { label: 'Транзакции', icon: 'pi-list', to: '/expenses' },
  { label: 'Счета', icon: 'pi-wallet', to: '/accounts' },
  { label: 'Инвестиции', icon: 'pi-briefcase', to: '/investments' },
  { label: 'Профиль', icon: 'pi-user', to: '/profile' },
]
</script>

<template>
  <nav
    class="bottom-tab-bar"
    aria-label="Основная навигация"
  >
    <router-link
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="bottom-tab-bar__item"
      :aria-current="route.path === tab.to ? 'page' : undefined"
    >
      <i
        :class="['pi', tab.icon]"
        aria-hidden="true"
      />
      <span class="bottom-tab-bar__label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.bottom-tab-bar {
  position: fixed;
  z-index: var(--ft-z-sticky);
  right: 0;
  bottom: 0;
  left: 0;

  display: none;
  align-items: stretch;

  height: var(--ft-bottom-bar-height);
  padding-bottom: env(safe-area-inset-bottom, 0px);

  background: var(--ft-surface-base);
  border-top: 1px solid var(--ft-border-default);
  box-shadow: 0 -2px 8px rgb(0 0 0 / 8%);
}

.bottom-tab-bar__item {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: var(--ft-space-1);
  align-items: center;
  justify-content: center;

  min-width: 0;
  min-height: 44px;

  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  text-decoration: none;

  transition: color var(--ft-transition-fast), background-color var(--ft-transition-fast);
}

.bottom-tab-bar__item i {
  font-size: 1.25rem;
}

.bottom-tab-bar__item:hover {
  color: var(--ft-text-secondary);
  background: color-mix(in srgb, var(--ft-primary-500) 8%, transparent);
}

.bottom-tab-bar__item[aria-current='page'] {
  color: var(--ft-primary-500);
}

.bottom-tab-bar__item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500) 65%, transparent);
  outline-offset: -2px;
}

.bottom-tab-bar__label {
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (width < 1024px) {
  .bottom-tab-bar {
    display: flex;
  }
}
</style>
