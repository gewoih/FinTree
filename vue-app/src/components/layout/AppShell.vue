<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useTheme } from '../../composables/useTheme'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const sidebarVisible = ref(false)
const userMenuRef = ref<{ toggle: (event: Event) => void } | null>(null)

const { darkMode, toggleTheme, initTheme } = useTheme()

const userEmail = computed(() => authStore.userEmail ?? 'Account')

const navigationItems = [
  { label: 'Дашборд', icon: 'pi-home', to: '/dashboard' },
  { label: 'Счета', icon: 'pi-wallet', to: '/accounts' },
  { label: 'Транзакции', icon: 'pi-list', to: '/expenses' },
  { label: 'Категории', icon: 'pi-tags', to: '/categories' },
  { label: 'Аналитика', icon: 'pi-chart-line', to: '/analytics' },
  { label: 'Настройки', icon: 'pi-cog', to: '/profile' }
]

const userMenuItems = [
  { label: 'Профиль', icon: 'pi pi-user', command: () => router.push('/profile') },
  { label: 'Настройки', icon: 'pi pi-cog', command: () => router.push('/profile') },
  { separator: true },
  { label: 'Выход', icon: 'pi pi-sign-out', command: () => handleLogout() }
]

const handleUserMenuToggle = (event: Event) => {
  userMenuRef.value?.toggle(event)
}

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

watch(
  () => route.fullPath,
  () => {
    sidebarVisible.value = false
  }
)

onMounted(() => {
  initTheme()
})
</script>

<template>
  <div class="app-shell">
    <a class="app-shell__skip-link" href="#main-content">Skip to main content</a>

    <!-- Top Navigation -->
    <div class="app-shell__topnav">
      <div class="app-shell__topnav-left">
        <Button
          icon="pi pi-bars"
          text
          rounded
          class="app-shell__menu-toggle lg:hidden"
          @click="toggleSidebar"
        />
        <router-link to="/dashboard" class="app-shell__logo">
          <i class="pi pi-chart-bar" />
          <span>FinTree</span>
        </router-link>
      </div>

      <div class="app-shell__topnav-right">
        <Button
          :icon="darkMode ? 'pi pi-sun' : 'pi pi-moon'"
          text
          rounded
          :aria-label="darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        />

        <div class="app-shell__user-menu">
          <Button
            type="button"
            :label="userEmail"
            icon="pi pi-user"
            text
            @click="handleUserMenuToggle"
          />
          <Menu ref="userMenuRef" :model="userMenuItems" popup />
        </div>
      </div>
    </div>

    <!-- Desktop Sidebar -->
    <aside class="app-shell__sidebar-desktop">
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
    </aside>

    <!-- Main Content -->
    <main id="main-content" class="app-shell__main" tabindex="-1">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  --app-shell-nav-height: 72px;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "topnav"
    "main";
  min-height: 100vh;
  background: var(--ft-bg-base);
}

.app-shell__skip-link {
  position: absolute;
  left: var(--ft-space-4);
  top: -100%;
  padding: var(--ft-space-2) var(--ft-space-3);
  background: var(--ft-primary-600);
  color: var(--ft-text-inverse);
  border-radius: var(--ft-radius-md);
  box-shadow: var(--ft-shadow-soft);
  transition: top var(--ft-transition-fast);
  z-index: calc(var(--ft-z-sticky) + 1);
}

.app-shell__skip-link:focus {
  top: var(--ft-space-4);
}

@media (min-width: 1024px) {
  .app-shell {
    grid-template-columns: 240px 1fr;
    grid-template-areas:
      "topnav topnav"
      "sidebar main";
  }
}

/* Top Navigation */
.app-shell__topnav {
  grid-area: topnav;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ft-space-4) var(--ft-space-6);
  background: var(--ft-surface-base);
  border-bottom: 1px solid var(--ft-border-subtle);
  position: sticky;
  top: 0;
  z-index: var(--ft-z-sticky);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
}

.app-shell__topnav-left {
  display: flex;
  align-items: center;
  gap: var(--ft-space-4);
}

.app-shell__topnav-right {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.app-shell__menu-toggle {
  margin-left: calc(var(--ft-space-4) * -1);
}

.app-shell__logo {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  text-decoration: none;
  transition: color var(--ft-transition-fast);
}

.app-shell__logo i {
  font-size: 1.5rem;
  color: var(--ft-primary-600);
}

.app-shell__logo:hover {
  color: var(--ft-primary-600);
}

/* Sidebar - Desktop */
.app-shell__sidebar-desktop {
  display: none;
}

@media (min-width: 1024px) {
  .app-shell__sidebar-desktop {
    display: block;
    grid-area: sidebar;
    background: var(--ft-surface-base);
    border-right: 1px solid var(--ft-border-subtle);
    padding: var(--ft-space-6) var(--ft-space-4);
    position: sticky;
    top: var(--app-shell-nav-height);
    height: calc(100vh - var(--app-shell-nav-height));
    overflow-y: auto;
  }
}

.app-shell__drawer-mobile :deep(.p-drawer) {
  width: 280px;
  background: var(--ft-surface-soft);
  border-right: 1px solid var(--ft-border-soft);
}

.app-shell__drawer-mobile :deep(.p-drawer-header) {
  padding: var(--ft-space-5) var(--ft-space-4) var(--ft-space-3);
}

.app-shell__drawer-header {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
}

.app-shell__drawer-header i {
  font-size: 1.5rem;
  color: var(--ft-primary-600);
}

/* Navigation */
.app-shell__nav {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
  margin-top: var(--ft-space-4);
}

.app-shell__nav-link {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3) var(--ft-space-4);
  border-radius: var(--ft-radius-lg);
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);
  text-decoration: none;
  transition: all var(--ft-transition-fast);
  position: relative;
}

.app-shell__nav-link:hover {
  background: rgba(37, 99, 235, 0.08);
  color: var(--ft-text-primary);
}

.app-shell__nav-link.router-link-active {
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(59, 130, 246, 0.05) 100%
  );
  color: var(--ft-primary-600);
  font-weight: var(--ft-font-semibold);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.1);
}

.dark-mode .app-shell__nav-link.router-link-active {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.15) 0%,
    rgba(96, 165, 250, 0.1) 100%
  );
  color: var(--ft-primary-400);
}

.app-shell__nav-link i {
  font-size: 1.25rem;
}

/* Main Content */
.app-shell__main {
  grid-area: main;
  padding: var(--ft-space-8) var(--ft-space-6);
  max-width: 1536px;
  margin: 0 auto;
  width: 100%;
  outline: none;
}

@media (max-width: 768px) {
  .app-shell__main {
    padding: var(--ft-space-6) var(--ft-space-4);
  }
}

/* User Menu */
.app-shell__user-menu {
  position: relative;
}

.app-shell__user-menu :deep(.p-menu) {
  min-width: 200px;
  margin-top: var(--ft-space-2);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-link) {
  padding: var(--ft-space-3) var(--ft-space-4);
  gap: var(--ft-space-3);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-icon) {
  color: var(--ft-text-muted);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-text) {
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
}

.app-shell__user-menu :deep(.p-menu .p-menu-separator) {
  margin: var(--ft-space-2) 0;
}
</style>
