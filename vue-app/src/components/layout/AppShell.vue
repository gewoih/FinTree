<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useUserStore } from '../../stores/user'
import { useTheme } from '../../composables/useTheme'
import { useViewport } from '../../composables/useViewport'

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
  { label: 'Аналитика', icon: 'pi-chart-line', to: '/analytics' },
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
        <Button
          :icon="isDesktop && sidebarCollapsed ? 'pi pi-angle-right' : isDesktop ? 'pi pi-angle-left' : 'pi pi-bars'"
          text
          rounded
          class="app-shell__menu-toggle"
          :aria-label="isDesktop ? (sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню') : 'Открыть меню'"
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
          <Button
            type="button"
            :label="userButtonLabel"
            icon="pi pi-user"
            text
            class="app-shell__user-button"
            @click="handleUserMenuToggle"
          />
          <Menu
            ref="userMenuRef"
            :model="userMenuItems"
            popup
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
  </div>
</template>

<style scoped>
.app-shell {
  --app-shell-nav-height: 72px;

  display: grid;
  grid-template:
    "topnav" auto "main" 1fr / 1fr;
  min-height: 100vh;
  background: var(--bg);
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

  padding: var(--space-4) var(--space-6);

  background: var(--surface-1);
  border-bottom: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.app-shell__readonly-banner {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;

  padding: var(--space-2) var(--space-6);

  background: color-mix(in srgb, var(--ft-warning) 18%, var(--surface-1));
  border-bottom: 1px solid color-mix(in srgb, var(--ft-warning) 35%, transparent);
}

.app-shell__readonly-copy {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;

  font-size: var(--ft-text-sm);
  color: var(--text);
}

.app-shell__readonly-copy i {
  color: color-mix(in srgb, var(--ft-warning) 80%, var(--text));
}

.app-shell__topnav-left {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.app-shell__topnav-right {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.app-shell__menu-toggle {
  margin-left: calc(var(--space-4) * -1);
}

.app-shell__logo {
  display: flex;
  gap: var(--space-3);
  align-items: center;

  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--text);
  text-decoration: none;

  transition: color var(--ft-transition-fast);
}

.app-shell__logo i {
  font-size: 1.5rem;
  color: var(--accent);
}

.app-shell__logo:hover {
  color: var(--accent);
}

/* Sidebar - Desktop */
.app-shell__sidebar-desktop {
  display: none;
}

.app-shell__drawer-mobile :deep(.p-drawer) {
  width: 280px;
  background: var(--surface-2);
  border-right: 1px solid var(--border);
}

.app-shell__drawer-mobile :deep(.p-drawer-header) {
  padding: var(--space-5) var(--space-4) var(--space-3);
}

.app-shell__drawer-header {
  display: flex;
  gap: var(--space-3);
  align-items: center;

  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--text);
}

.app-shell__drawer-header i {
  font-size: 1.5rem;
  color: var(--accent);
}

/* Navigation */
.app-shell__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-4);
}

.app-shell__nav-link {
  position: relative;

  display: flex;
  gap: var(--space-3);
  align-items: center;

  padding: var(--space-3) var(--space-4);

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--text-muted);
  text-decoration: none;

  border-radius: var(--ft-radius-lg);

  transition: all var(--ft-transition-fast);
}

.app-shell__nav-link:hover {
  color: var(--text);
  background: color-mix(in srgb, var(--accent) 18%, var(--surface-1));
}

.app-shell__nav-link.router-link-active {
  font-weight: var(--ft-font-semibold);
  color: var(--text);
  background: color-mix(in srgb, var(--accent) 24%, var(--surface-1));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent);
}

.app-shell__nav-link i {
  font-size: 1.25rem;
}

.app-shell__nav-link--collapsed {
  justify-content: center;
  padding: var(--space-3);
}

.app-shell__nav-link--collapsed i {
  font-size: 1.3rem;
}

/* Main Content */
.app-shell__main {
  grid-area: main;
  width: 100%;
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
  margin-top: var(--space-2);
  padding: var(--space-2);

  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--surface-1) 92%, transparent),
    color-mix(in srgb, var(--surface-2) 92%, transparent)
  );
  backdrop-filter: blur(10px);
  border: 1px solid color-mix(in srgb, var(--border) 65%, transparent);
  border-radius: var(--ft-radius-xl);
  box-shadow:
    0 16px 32px rgb(15 23 42 / 22%),
    inset 0 1px 0 rgb(255 255 255 / 4%);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-link) {
  gap: var(--space-3);

  min-height: 44px;
  padding: 0.7rem 0.85rem;

  color: var(--text);

  border-radius: var(--ft-radius-lg);

  transition: background var(--ft-transition-fast), color var(--ft-transition-fast), transform var(--ft-transition-fast);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-link:hover) {
  transform: translateY(-1px);
  color: var(--text);
  background: color-mix(in srgb, var(--accent) 18%, transparent);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-link:focus-visible) {
  outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent);
  outline-offset: 2px;
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-icon) {
  color: var(--text-muted);
}

.app-shell__user-menu :deep(.p-menu .p-menuitem-link:hover .p-menuitem-icon) {
  color: var(--accent);
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
    grid-template-columns: 240px 1fr;
    transition: grid-template-columns 0.2s ease;
  }

  .app-shell--collapsed {
    grid-template-columns: 64px 1fr;
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
    padding: var(--space-6) var(--space-4);

    background: var(--surface-1);
    border-right: 1px solid var(--border);

    transition: padding 0.2s ease;
  }

  .app-shell__sidebar-desktop--collapsed {
    overflow: visible;
    padding: var(--space-6) var(--ft-space-2);
  }
}

@media (width <= 768px) {
  .app-shell__main {
    padding: 0;
  }
}

@media (width <= 640px) {
  .app-shell__readonly-banner {
    flex-direction: column;
    align-items: stretch;
    padding: var(--space-2) var(--space-4);
  }

  .app-shell__topnav {
    padding: var(--space-3) var(--space-4);
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
