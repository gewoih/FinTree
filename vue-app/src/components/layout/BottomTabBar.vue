<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { label: 'Обзор', icon: 'pi-chart-line', to: '/analytics' },
  { label: 'Счета', icon: 'pi-wallet', to: '/accounts' },
  { label: 'Транзакции', icon: 'pi-list', to: '/transactions' },
  { label: 'Инвестиции', icon: 'pi-briefcase', to: '/investments' },
  { label: 'Ещё', icon: 'pi-ellipsis-h', to: '/profile' }
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
  padding-bottom: env(safe-area-inset-bottom, 0);

  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ft-surface-base) 95%, transparent),
    color-mix(in srgb, var(--ft-surface-raised) 98%, transparent)
  );
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--ft-border-default);
  box-shadow:
    var(--ft-shadow-sm),
    inset 0 1px 0 color-mix(in srgb, var(--ft-text-inverse) 3%, transparent);
}

.bottom-tab-bar__item {
  position: relative;

  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: var(--ft-space-1);
  align-items: center;
  justify-content: center;

  min-width: 0;
  min-height: 44px;

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-tertiary);
  text-decoration: none;

  transition:
    color var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.bottom-tab-bar__item::before {
  content: '';

  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);

  width: 0;
  height: 2px;

  background: linear-gradient(90deg, var(--ft-primary-400), var(--ft-primary-500));
  border-radius: 0 0 2px 2px;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--ft-primary-500) 50%, transparent);

  transition: width var(--ft-transition-base);
}

.bottom-tab-bar__item i {
  font-size: 1.3rem;
  transition: all var(--ft-transition-fast);
}

.bottom-tab-bar__item:active {
  transform: scale(0.96);
}

.bottom-tab-bar__item:hover {
  color: var(--ft-text-secondary);
  background: color-mix(in srgb, var(--ft-primary-500) 6%, transparent);
}

.bottom-tab-bar__item:hover i {
  transform: translateY(-1px);
}

.bottom-tab-bar__item[aria-current='page'] {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-primary-400);
}

.bottom-tab-bar__item[aria-current='page']::before {
  width: 40%;
}

.bottom-tab-bar__item[aria-current='page'] i {
  transform: scale(1.05);
  color: var(--ft-primary-400);
}

.bottom-tab-bar__item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500) 65%, transparent);
  outline-offset: -2px;
}

.bottom-tab-bar__label {
  overflow: hidden;

  max-width: 100%;

  text-overflow: ellipsis;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

@media (width < 1024px) {
  .bottom-tab-bar {
    display: flex;
  }
}
</style>
