<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.ts'
import { useUserStore } from '@/stores/user.ts'
import { useTheme } from '@/composables/useTheme.ts'
import { useViewport } from '@/composables/useViewport.ts'
import Menu from 'primevue/menu'
import Drawer from 'primevue/drawer'
import ThemeToggle from '../common/ThemeToggle.vue'
import UiButton from '../../ui/UiButton.vue'
import BottomTabBar from './BottomTabBar.vue'

const authStore = useAuthStore()
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const sidebarVisible = ref(false)
const sidebarCollapsed = ref(
  typeof localStorage !== 'undefined' && localStorage.getItem('ft-sidebar-collapsed') === '1'
)
const userMenuRef = ref<{ toggle: (event: Event) => void } | null>(null)

const { initTheme } = useTheme()

const userEmail = computed(() => authStore.userEmail ?? 'Аккаунт')

const { isMobile, isTablet } = useViewport()

// Only show drawer on mobile (width < 1024px)
const isDrawerVisible = computed(() => isTablet.value)
const isDesktop = computed(() => !isTablet.value)

const userButtonLabel = computed(() => (isMobile.value ? undefined : userEmail.value))
const isReadOnlyMode = computed(() => userStore.isReadOnlyMode)
const subscriptionExpiresAtLabel = computed(() => {
  const rawExpiresAt = userStore.subscription?.expiresAtUtc
  if (!rawExpiresAt) return null

  const expiresAt = new Date(rawExpiresAt)
  if (Number.isNaN(expiresAt.getTime())) return null
  return expiresAt.toLocaleDateString('ru-RU')
})

const navigationItems = [
  { label: 'Главная', icon: 'pi-home', to: '/analytics' },
  { label: 'Транзакции', icon: 'pi-list', to: '/expenses' },
  { label: 'Счета', icon: 'pi-wallet', to: '/accounts' },
  { label: 'Инвестиции', icon: 'pi-briefcase', to: '/investments' }
]

const userMenuItems = [
  { label: 'Настройки', icon: 'pi pi-cog', command: () => router.push('/profile') },
  { label: 'Выйти', icon: 'pi pi-sign-out', command: () => handleLogout() }
]

const handleUserMenuToggle = (event: Event) => {
  userMenuRef.value?.toggle(event)
}

const toggleSidebar = () => {
  if (isDesktop.value) {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('ft-sidebar-collapsed', sidebarCollapsed.value ? '1' : '0')
  } else {
    sidebarVisible.value = !sidebarVisible.value
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const openSubscription = () => {
  router.push('/profile#subscription')
}

watch(
  () => route.fullPath,
  () => {
    sidebarVisible.value = false
  }
)

onMounted(() => {
  initTheme()
  void userStore.fetchCurrentUser(true)
})
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'app-shell--collapsed': isDesktop && sidebarCollapsed }"
  >
    <a
      class="app-shell__skip-link"
      href="#main-content"
    >Перейти к основному содержимому</a>

    <!-- Top Navigation -->
    <div class="app-shell__topnav">
      <div class="app-shell__topnav-left">
        <UiButton
          v-if="isDesktop"
          :icon="sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'"
          variant="ghost"
          rounded
          class="app-shell__menu-toggle"
          :aria-label="sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
          :aria-expanded="!sidebarCollapsed"
          @click="toggleSidebar"
        />
        <router-link
          to="/analytics"
          class="app-shell__logo"
        >
          <i class="pi pi-chart-bar" />
          <span>FinTree</span>
        </router-link>
      </div>

      <div class="app-shell__topnav-right">
        <ThemeToggle />
        <div class="app-shell__user-menu">
          <UiButton
            type="button"
            :label="userButtonLabel"
            icon="pi pi-user"
            variant="ghost"
            class="app-shell__user-button"
            @click="handleUserMenuToggle"
          />
          <Menu
            ref="userMenuRef"
            :model="userMenuItems"
            popup
            :base-z-index="1030"
          />
        </div>
      </div>
    </div>

    <div
      v-if="isReadOnlyMode"
      class="app-shell__readonly-banner"
      role="status"
      aria-live="polite"
    >
      <div class="app-shell__readonly-copy">
        <i
          class="pi pi-lock"
          aria-hidden="true"
        />
        <span>Режим просмотра: подписка неактивна{{ subscriptionExpiresAtLabel ? ` (истекла ${subscriptionExpiresAtLabel})` : '' }}.</span>
      </div>
      <UiButton
        label="Оплатить"
        icon="pi pi-credit-card"
        size="sm"
        @click="openSubscription"
      />
    </div>

    <!-- Mobile Drawer (hidden on desktop) -->
    <Drawer
      v-if="isDrawerVisible"
      v-model:visible="sidebarVisible"
      position="left"
      class="app-shell__drawer-mobile"
    >
      <template #header>
        <div class="app-shell__drawer-header">
          <i class="pi pi-chart-bar" />
          <span>FinTree</span>
        </div>
      </template>
      <nav class="app-shell__nav">
        <router-link
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          class="app-shell__nav-link"
          :aria-current="route.path === item.to ? 'page' : undefined"
        >
          <i :class="['pi', item.icon]" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </Drawer>

    <!-- Desktop Sidebar -->
    <aside
      class="app-shell__sidebar-desktop"
      :class="{ 'app-shell__sidebar-desktop--collapsed': sidebarCollapsed }"
    >
      <nav class="app-shell__nav">
        <router-link
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          class="app-shell__nav-link"
          :class="{ 'app-shell__nav-link--collapsed': sidebarCollapsed }"
          :aria-current="route.path === item.to ? 'page' : undefined"
          :title="sidebarCollapsed ? item.label : undefined"
        >
          <i :class="['pi', item.icon]" />
          <span
            v-if="!sidebarCollapsed"
            class="app-shell__nav-label"
          >{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- Main Content -->
    <main
      id="main-content"
      class="app-shell__main"
      tabindex="-1"
    >
      <slot />
    </main>

    <BottomTabBar />
  </div>
</template>

<style scoped>
.app-shell {
  --app-shell-nav-height: 72px;

  overflow-x: clip;
  display: grid;
  grid-template:
    "topnav" auto "main" 1fr / minmax(0, 1fr);
  min-height: 100vh;
  background: var(--ft-bg-base);
}

.app-shell__skip-link {
  position: absolute;
  z-index: calc(var(--ft-z-sticky) + 1);
  top: -100%;
  left: var(--ft-space-4);

  padding: var(--ft-space-2) var(--ft-space-3);

  color: var(--ft-text-inverse);

  background: var(--ft-primary-600);
  border-radius: var(--ft-radius-md);
  box-shadow: var(--ft-shadow-soft);

  transition: top var(--ft-transition-fast);
}

.app-shell__skip-link:focus {
  top: var(--ft-space-4);
}

/* Top Navigation */
.app-shell__topnav {
  position: sticky;
  z-index: var(--ft-z-sticky);
  top: 0;

  display: flex;
  grid-area: topnav;
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-4) var(--ft-space-8);

  background: var(--ft-surface-base);
  border-bottom: 1px solid var(--ft-border-default);
  box-shadow: var(--ft-shadow-md);
}

.app-shell__readonly-banner {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-2) var(--ft-space-8);

  background: color-mix(in srgb, var(--ft-warning) 18%, var(--ft-surface-base));
  border-bottom: 1px solid color-mix(in srgb, var(--ft-warning) 35%, transparent);
}

.app-shell__readonly-copy {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-primary);
}

.app-shell__readonly-copy i {
  color: color-mix(in srgb, var(--ft-warning) 80%, var(--ft-text-primary));
}

.app-shell__topnav-left {
  display: flex;
  gap: var(--ft-space-4);
  align-items: center;
}

.app-shell__topnav-right {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.app-shell__menu-toggle {
  margin-left: calc(var(--ft-space-4) * -1);
}

.app-shell__logo {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  text-decoration: none;

  transition: color var(--ft-transition-fast);
}

.app-shell__logo i {
  font-size: 1.5rem;
  color: var(--ft-primary-500);
}

.app-shell__logo:hover {
  color: var(--ft-primary-500);
}

/* Sidebar - Desktop */
.app-shell__sidebar-desktop {
  display: none;
}

.app-shell__drawer-mobile :deep(.p-drawer) {
  width: 280px;
  background: var(--ft-surface-raised);
  border-right: 1px solid var(--ft-border-default);
}

.app-shell__drawer-mobile :deep(.p-drawer-header) {
  padding: var(--ft-space-6) var(--ft-space-4) var(--ft-space-3);
}

.app-shell__drawer-header {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
}

.app-shell__drawer-header i {
  font-size: 1.5rem;
  color: var(--ft-primary-500);
}

/* Navigation */
.app-shell__nav {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
  margin-top: var(--ft-space-4);
}

.app-shell__nav-link {
  position: relative;

  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  padding: var(--ft-space-3) var(--ft-space-4);

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
  text-decoration: none;

  border-radius: var(--ft-radius-lg);

  transition: all var(--ft-transition-fast);
}

.app-shell__nav-link:hover {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-primary-500) 18%, var(--ft-surface-base));
}

.app-shell__nav-link.router-link-active {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-primary-500) 24%, var(--ft-surface-base));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ft-primary-500) 45%, transparent);
}

.app-shell__nav-link i {
  font-size: 1.25rem;
}

.app-shell__nav-link--collapsed {
  justify-content: center;
  padding: var(--ft-space-3);
}

.app-shell__nav-link--collapsed i {
  font-size: 1.3rem;
}

/* Main Content */
.app-shell__main {
  overflow-x: hidden;
  grid-area: main;
  width: 100%;
  min-width: 0;
  padding: 0;
  outline: none;
}

/* User Menu */
.app-shell__user-menu {
  position: relative;
}

.app-shell__user-button :deep(.p-button-label) {
  overflow: hidden;
  max-width: 220px;
  text-overflow: ellipsis;
}

.app-shell__user-menu :deep(.p-menu) {
  min-width: 190px;
  margin-top: var(--ft-space-2);
  padding: var(--ft-space-2);

  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--ft-surface-base) 92%, transparent),
    color-mix(in srgb, var(--ft-surface-raised) 92%, transparent)
  );
  backdrop-filter: blur(10px);
  border: 1px solid color-mix(in srgb, var(--ft-border-default) 65%, transparent);
  border-radius: var(--ft-radius-xl);
  box-shadow:
    0 16px 32px rgb(15 23 42 / 22%),
    inset 0 1px 0 rgb(255 255 255 / 4%);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-link) {
  gap: var(--ft-space-3);

  min-height: 44px;
  padding: 0.7rem 0.85rem;

  color: var(--ft-text-primary);

  border-radius: var(--ft-radius-lg);

  transition: background var(--ft-transition-fast), color var(--ft-transition-fast), transform var(--ft-transition-fast);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-link:hover) {
  transform: translateY(-1px);
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-primary-500) 18%, transparent);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-link:focus-visible) {
  outline: 2px solid color-mix(in srgb, var(--ft-primary-500) 60%, transparent);
  outline-offset: 2px;
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-icon) {
  color: var(--ft-text-secondary);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-link:hover .p-menuitem-icon) {
  color: var(--ft-primary-500);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-text) {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
}

@media (width >= 1024px) {
  .app-shell {
    grid-template-areas:
      "topnav topnav"
      "sidebar main";
    grid-template-columns: 240px minmax(0, 1fr);
    transition: grid-template-columns 0.2s ease;
  }

  .app-shell--collapsed {
    grid-template-columns: 64px minmax(0, 1fr);
  }
}

@media (width >= 1024px) {
  .app-shell__sidebar-desktop {
    position: sticky;
    top: var(--app-shell-nav-height);

    overflow-y: auto;
    display: block;
    grid-area: sidebar;

    height: calc(100vh - var(--app-shell-nav-height));
    padding: var(--ft-space-8) var(--ft-space-4);

    background: var(--ft-surface-base);
    border-right: 1px solid var(--ft-border-default);

    transition: padding 0.2s ease;
  }

  .app-shell__sidebar-desktop--collapsed {
    overflow: visible;
    padding: var(--ft-space-8) var(--ft-space-2);
  }
}

@media (width < 1024px) {
  .app-shell__main {
    padding-bottom: calc(var(--ft-bottom-bar-height) + env(safe-area-inset-bottom, 0px));
  }
}

@media (width <= 640px) {
  .app-shell__readonly-banner {
    flex-direction: column;
    align-items: stretch;
    padding: var(--ft-space-2) var(--ft-space-4);
  }

  .app-shell__topnav {
    padding: var(--ft-space-3) var(--ft-space-4);
  }

  .app-shell__logo span {
    font-size: 1rem;
  }

  .app-shell__user-button :deep(.p-button-label) {
    display: none;
  }

  .app-shell__user-button {
    min-width: 44px;
    padding-inline: 0.6rem;
  }
}
</style>
