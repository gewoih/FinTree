<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const primaryTabs = [
  { label: 'Главная', icon: 'pi-chart-line', to: '/analytics' },
  { label: 'Счета', icon: 'pi-wallet', to: '/accounts' },
  { label: 'Транзакции', icon: 'pi-list', to: '/transactions' },
  { label: 'Инвестиции', icon: 'pi-briefcase', to: '/investments' }
]

const moreMenuItems = [
  { label: 'Профиль', icon: 'pi-user', to: '/profile' },
  { label: 'Рефлексии', icon: 'pi-book', to: '/reflections' }
]

const moreMenuRef = ref<HTMLElement | null>(null)
const isMoreMenuOpen = ref(false)

const isRouteActive = (targetPath: string) =>
  route.path === targetPath || route.path.startsWith(`${targetPath}/`)

const isMoreActive = computed(() => moreMenuItems.some(item => isRouteActive(item.to)))

const closeMoreMenu = () => {
  isMoreMenuOpen.value = false
}

const toggleMoreMenu = () => {
  isMoreMenuOpen.value = !isMoreMenuOpen.value
}

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target
  if (!(target instanceof Node) || !moreMenuRef.value?.contains(target)) {
    closeMoreMenu()
  }
}

watch(
  isMoreMenuOpen,
  isOpen => {
    if (isOpen) {
      document.addEventListener('click', handleOutsideClick)
      return
    }
    document.removeEventListener('click', handleOutsideClick)
  }
)

watch(
  () => route.fullPath,
  () => {
    closeMoreMenu()
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <nav
    class="bottom-tab-bar"
    aria-label="Основная навигация"
  >
    <router-link
      v-for="tab in primaryTabs"
      :key="tab.to"
      :to="tab.to"
      class="bottom-tab-bar__item"
      :aria-current="isRouteActive(tab.to) ? 'page' : undefined"
    >
      <i
        :class="['pi', tab.icon]"
        aria-hidden="true"
      />
      <span class="bottom-tab-bar__label">{{ tab.label }}</span>
    </router-link>

    <div
      ref="moreMenuRef"
      class="bottom-tab-bar__more"
    >
      <button
        type="button"
        class="bottom-tab-bar__item bottom-tab-bar__item--button"
        :aria-current="isMoreActive ? 'page' : undefined"
        :aria-expanded="isMoreMenuOpen"
        aria-controls="mobile-more-menu"
        aria-haspopup="true"
        @click="toggleMoreMenu"
      >
        <i
          class="pi pi-ellipsis-h"
          aria-hidden="true"
        />
        <span class="bottom-tab-bar__label">Ещё</span>
      </button>

      <nav
        v-if="isMoreMenuOpen"
        id="mobile-more-menu"
        class="bottom-tab-bar__more-menu"
        aria-label="Дополнительная навигация"
      >
        <router-link
          v-for="item in moreMenuItems"
          :key="item.to"
          :to="item.to"
          class="bottom-tab-bar__more-link"
          :aria-current="isRouteActive(item.to) ? 'page' : undefined"
          @click="closeMoreMenu"
        >
          <i
            :class="['pi', item.icon]"
            aria-hidden="true"
          />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </div>
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

  background: var(--ft-surface-raised);
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
    transform var(--ft-transition-fast);
}

.bottom-tab-bar__item--button {
  cursor: pointer;
  border: 0;
  font: inherit;
  text-align: inherit;
  background: transparent;
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

.bottom-tab-bar__more {
  position: relative;
  display: flex;
  flex: 1 1 0;
}

.bottom-tab-bar__more-menu {
  position: absolute;
  right: var(--ft-space-2);
  bottom: calc(100% + var(--ft-space-2));
  z-index: calc(var(--ft-z-sticky) + 2);

  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);

  min-width: 168px;
  padding: var(--ft-space-2);

  background: color-mix(in srgb, var(--ft-surface-raised) 96%, var(--ft-surface-base));
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);
  box-shadow: var(--ft-shadow-md);
}

.bottom-tab-bar__more-link {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  min-height: 40px;
  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
  text-decoration: none;

  border-radius: var(--ft-radius-md);
  transition: all var(--ft-transition-fast);
}

.bottom-tab-bar__more-link:hover {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-primary-500) 10%, transparent);
}

.bottom-tab-bar__more-link[aria-current='page'] {
  color: var(--ft-primary-400);
  background: color-mix(in srgb, var(--ft-primary-500) 12%, transparent);
}

@media (width < 1024px) {
  .bottom-tab-bar {
    display: flex;
  }
}
</style>
