<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.ts'
import { useUserStore } from '@/stores/user.ts'
import { useTheme } from '@/composables/useTheme.ts'
import { useViewport } from '@/composables/useViewport.ts'
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
const { initTheme } = useTheme()

const userDisplayName = computed(() => {
  const name = userStore.currentUser?.name?.trim()
  if (name) return name
  return authStore.userEmail ?? 'Аккаунт'
})

const { isTablet } = useViewport()

// Only show drawer on mobile (width < 1024px)
const isDrawerVisible = computed(() => isTablet.value)
const isDesktop = computed(() => !isTablet.value)

const isReadOnlyMode = computed(() => userStore.isReadOnlyMode)
const subscriptionExpiresAtLabel = computed(() => {
  const rawExpiresAt = userStore.subscription?.expiresAtUtc
  if (!rawExpiresAt) return null

  const expiresAt = new Date(rawExpiresAt)
  if (Number.isNaN(expiresAt.getTime())) return null
  return expiresAt.toLocaleDateString('ru-RU')
})

const primaryNavItems = [
  { label: 'Обзор', icon: 'pi-chart-line', to: '/analytics', badge: null },
  { label: 'Счета', icon: 'pi-wallet', to: '/accounts', badge: null },
  { label: 'Транзакции', icon: 'pi-list', to: '/transactions', badge: null },
  { label: 'Инвестиции', icon: 'pi-briefcase', to: '/investments', badge: null }
]

const secondaryNavItems = [
  { label: 'Категории', icon: 'pi-tags', to: '/categories' },
  { label: 'Настройки', icon: 'pi-cog', to: '/profile' }
]

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
  // User is already loaded by router guard (authStore.ensureSession)
  // No need to fetch again
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
    <header class="app-shell__topnav">
      <div class="app-shell__topnav-left">
        <UiButton
          v-if="!isTablet"
          :icon="sidebarCollapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'"
          variant="ghost"
          rounded
          class="app-shell__menu-toggle"
          :aria-label="sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
          :aria-expanded="!sidebarCollapsed"
          @click="toggleSidebar"
        />
        <UiButton
          v-if="isTablet"
          icon="pi pi-bars"
          variant="ghost"
          rounded
          class="app-shell__menu-toggle"
          aria-label="Открыть меню"
          @click="toggleSidebar"
        />
        <router-link
          to="/analytics"
          class="app-shell__logo"
        >
          <div class="app-shell__logo-icon">
            <i class="pi pi-chart-bar" />
          </div>
          <span class="app-shell__logo-text">FinTree</span>
        </router-link>
      </div>

      <div class="app-shell__topnav-right">
        <ThemeToggle />
      </div>
    </header>

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

      <div class="app-shell__drawer-content">
        <!-- Primary Navigation -->
        <nav
          class="app-shell__nav"
          aria-label="Основная навигация"
        >
          <router-link
            v-for="item in primaryNavItems"
            :key="item.to"
            :to="item.to"
            class="app-shell__nav-link"
            :aria-current="route.path === item.to ? 'page' : undefined"
          >
            <i :class="['pi', item.icon]" />
            <span>{{ item.label }}</span>
          </router-link>
        </nav>

        <!-- Secondary Navigation -->
        <nav
          class="app-shell__nav app-shell__nav--secondary"
          aria-label="Дополнительная навигация"
        >
          <router-link
            v-for="item in secondaryNavItems"
            :key="item.to"
            :to="item.to"
            class="app-shell__nav-link app-shell__nav-link--secondary"
            :aria-current="route.path === item.to ? 'page' : undefined"
          >
            <i :class="['pi', item.icon]" />
            <span>{{ item.label }}</span>
          </router-link>
        </nav>

        <!-- User Section -->
        <div class="app-shell__drawer-user">
          <div class="app-shell__user-card">
            <div class="app-shell__user-avatar">
              <i class="pi pi-user" />
            </div>
            <div class="app-shell__user-info">
              <div class="app-shell__user-email">
                {{ userDisplayName }}
              </div>
              <div
                v-if="!isReadOnlyMode"
                class="app-shell__user-status app-shell__user-status--active"
              >
                <span class="app-shell__user-status-dot" />
                <span>Подписка активна</span>
              </div>
              <div
                v-else
                class="app-shell__user-status app-shell__user-status--inactive"
              >
                <span class="app-shell__user-status-dot" />
                <span>Режим просмотра</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="app-shell__logout-btn"
            @click="handleLogout"
          >
            <i class="pi pi-sign-out" />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </Drawer>

    <!-- Desktop Sidebar -->
    <aside
      class="app-shell__sidebar-desktop"
      :class="{ 'app-shell__sidebar-desktop--collapsed': sidebarCollapsed }"
    >
      <div class="app-shell__sidebar-content">
        <!-- Primary Navigation -->
        <nav
          class="app-shell__nav"
          aria-label="Основная навигация"
        >
          <router-link
            v-for="item in primaryNavItems"
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
            <span
              v-if="item.badge && !sidebarCollapsed"
              class="app-shell__nav-badge"
            >{{ item.badge }}</span>
          </router-link>
        </nav>

        <!-- Secondary Navigation -->
        <nav
          v-if="!sidebarCollapsed"
          class="app-shell__nav app-shell__nav--secondary"
          aria-label="Дополнительная навигация"
        >
          <router-link
            v-for="item in secondaryNavItems"
            :key="item.to"
            :to="item.to"
            class="app-shell__nav-link app-shell__nav-link--secondary"
            :aria-current="route.path === item.to ? 'page' : undefined"
          >
            <i :class="['pi', item.icon]" />
            <span class="app-shell__nav-label">{{ item.label }}</span>
          </router-link>
        </nav>

        <!-- User Section -->
        <div
          v-if="!sidebarCollapsed"
          class="app-shell__sidebar-user"
        >
          <div class="app-shell__user-card">
            <div class="app-shell__user-avatar">
              <i class="pi pi-user" />
            </div>
            <div class="app-shell__user-info">
              <div class="app-shell__user-email">
                {{ userDisplayName }}
              </div>
              <div
                v-if="!isReadOnlyMode"
                class="app-shell__user-status app-shell__user-status--active"
              >
                <span class="app-shell__user-status-dot" />
                <span>Подписка активна</span>
              </div>
              <div
                v-else
                class="app-shell__user-status app-shell__user-status--inactive"
              >
                <span class="app-shell__user-status-dot" />
                <span>Режим просмотра</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="app-shell__logout-btn"
            @click="handleLogout"
          >
            <i class="pi pi-sign-out" />
            <span>Выйти</span>
          </button>
        </div>
      </div>
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

  min-height: var(--app-shell-nav-height);
  padding: var(--ft-space-3) var(--ft-space-8);

  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--ft-surface-base) 98%, var(--ft-bg-base)),
    color-mix(in srgb, var(--ft-surface-raised) 95%, var(--ft-surface-base))
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ft-border-default);
  box-shadow:
    0 2px 12px rgb(0 0 0 / 8%),
    inset 0 -1px 0 rgb(255 255 255 / 3%);
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
  margin-left: calc(var(--ft-space-2) * -1);
  transition: all var(--ft-transition-fast);
}

.app-shell__menu-toggle:hover {
  transform: scale(1.05);
}

.app-shell__logo {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  text-decoration: none;

  transition: all var(--ft-transition-fast);
}

.app-shell__logo-icon {
  display: grid;
  place-items: center;

  width: 40px;
  height: 40px;

  background: linear-gradient(135deg, var(--ft-primary-500), var(--ft-primary-600));
  border-radius: var(--ft-radius-lg);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--ft-primary-500) 30%, transparent);

  transition: all var(--ft-transition-fast);
}

.app-shell__logo-icon i {
  font-size: 1.2rem;
  color: var(--ft-text-inverse);
}

.app-shell__logo-text {
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  letter-spacing: -0.02em;
  color: var(--ft-text-primary);

  transition: color var(--ft-transition-fast);
}

.app-shell__logo:hover .app-shell__logo-icon {
  transform: translateY(-2px);
  box-shadow:
    0 4px 12px color-mix(in srgb, var(--ft-primary-500) 40%, transparent),
    0 0 0 3px color-mix(in srgb, var(--ft-primary-500) 12%, transparent);
}

.app-shell__logo:hover .app-shell__logo-text {
  color: var(--ft-primary-400);
}

/* Sidebar - Desktop */
.app-shell__sidebar-desktop {
  display: none;
}

.app-shell__drawer-mobile :deep(.p-drawer) {
  width: 300px;
  background: linear-gradient(
    180deg,
    var(--ft-surface-raised),
    color-mix(in srgb, var(--ft-surface-base) 90%, var(--ft-surface-raised))
  );
  border-right: 1px solid var(--ft-border-default);
  box-shadow: 4px 0 24px rgb(0 0 0 / 15%);
}

.app-shell__drawer-mobile :deep(.p-drawer-header) {
  padding: var(--ft-space-6) var(--ft-space-5) var(--ft-space-4);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.app-shell__drawer-mobile :deep(.p-drawer-content) {
  display: flex;
  flex-direction: column;
  padding: var(--ft-space-4) var(--ft-space-5);
}

.app-shell__drawer-header {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  letter-spacing: -0.02em;
  color: var(--ft-text-primary);
}

.app-shell__drawer-header i {
  display: grid;
  place-items: center;

  width: 36px;
  height: 36px;

  font-size: 1.2rem;
  color: var(--ft-text-inverse);

  background: linear-gradient(135deg, var(--ft-primary-500), var(--ft-primary-600));
  border-radius: var(--ft-radius-lg);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--ft-primary-500) 30%, transparent);
}

/* Navigation */
.app-shell__nav {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.app-shell__nav--secondary {
  position: relative;
  margin-top: var(--ft-space-6);
  padding-top: var(--ft-space-6);
}

.app-shell__nav--secondary::before {
  content: '';

  position: absolute;
  top: 0;
  left: var(--ft-space-4);
  right: var(--ft-space-4);

  height: 1px;

  background: linear-gradient(
    90deg,
    transparent,
    var(--ft-border-default) 20%,
    var(--ft-border-default) 80%,
    transparent
  );
}

.app-shell__nav-link {
  position: relative;

  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  min-height: 44px;
  padding: var(--ft-space-3) var(--ft-space-4);

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  letter-spacing: -0.01em;
  color: var(--ft-text-secondary);
  text-decoration: none;

  background: transparent;
  border-radius: var(--ft-radius-lg);

  transition:
    all var(--ft-transition-fast),
    transform 0.18s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.app-shell__nav-link::before {
  content: '';

  position: absolute;
  z-index: 0;
  inset: 0;

  border-radius: inherit;
  opacity: 0;
  pointer-events: none;

  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 24%, transparent),
    color-mix(in srgb, var(--ft-primary-600) 18%, transparent)
  );
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ft-primary-400) 35%, transparent);

  transition: opacity var(--ft-transition-fast);
}

.app-shell__nav-link i {
  position: relative;
  z-index: 1;

  font-size: 1.25rem;

  transition: all var(--ft-transition-fast);
}

.app-shell__nav-label {
  position: relative;
  z-index: 1;
  flex: 1;
}

.app-shell__nav-badge {
  position: relative;
  z-index: 1;

  min-width: 20px;
  padding: 2px 6px;

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  line-height: 1;
  color: var(--ft-text-inverse);
  text-align: center;

  background: var(--ft-primary-500);
  border-radius: var(--ft-radius-full);
}

.app-shell__nav-link:hover {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-primary-500) 12%, transparent);
  transform: translateX(2px);
}

.app-shell__nav-link:hover i {
  color: var(--ft-primary-400);
  transform: scale(1.08);
}

.app-shell__nav-link.router-link-active {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  transform: translateX(0);
  box-shadow:
    0 2px 8px color-mix(in srgb, var(--ft-primary-500) 20%, transparent),
    0 0 0 1px color-mix(in srgb, var(--ft-primary-400) 25%, transparent);
}

.app-shell__nav-link.router-link-active::before {
  opacity: 1;
}

.app-shell__nav-link.router-link-active i {
  color: var(--ft-primary-300);
  transform: scale(1.05);
}

.app-shell__nav-link--secondary {
  min-height: 40px;
  padding: var(--ft-space-2) var(--ft-space-4);
  font-size: var(--ft-text-sm);
}

.app-shell__nav-link--collapsed {
  justify-content: center;
  padding: var(--ft-space-3);
}

.app-shell__nav-link--collapsed i {
  font-size: 1.35rem;
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

/* User Section */
.app-shell__sidebar-user,
.app-shell__drawer-user {
  margin-top: auto;
  padding-top: var(--ft-space-6);
}

.app-shell__user-card {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;

  padding: var(--ft-space-4);

  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-surface-raised) 85%, transparent),
    color-mix(in srgb, var(--ft-surface-base) 90%, transparent)
  );
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
  box-shadow: inset 0 1px 2px rgb(255 255 255 / 3%);
}

.app-shell__user-avatar {
  display: grid;
  place-items: center;

  width: 40px;
  height: 40px;

  background: linear-gradient(135deg, var(--ft-primary-500), var(--ft-primary-600));
  border-radius: var(--ft-radius-full);
  box-shadow:
    0 0 0 2px var(--ft-surface-base),
    0 2px 8px color-mix(in srgb, var(--ft-primary-500) 30%, transparent);
}

.app-shell__user-avatar i {
  font-size: 1.1rem;
  color: var(--ft-text-inverse);
}

.app-shell__user-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--ft-space-1);
  overflow: hidden;
}

.app-shell__user-email {
  overflow: hidden;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-shell__user-status {
  display: flex;
  gap: var(--ft-space-1);
  align-items: center;

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-medium);
}

.app-shell__user-status--active {
  color: var(--ft-success-500);
}

.app-shell__user-status--inactive {
  color: var(--ft-warning-500);
}

.app-shell__user-status-dot {
  display: block;
  width: 6px;
  height: 6px;
  background: currentcolor;
  border-radius: var(--ft-radius-full);
  box-shadow: 0 0 6px currentcolor;
}

.app-shell__logout-btn {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: center;

  width: 100%;
  min-height: 44px;
  margin-top: var(--ft-space-3);
  padding: var(--ft-space-3) var(--ft-space-4);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);

  cursor: pointer;
  background: transparent;
  border: 1px solid var(--ft-border-default);
  border-radius: var(--ft-radius-lg);

  transition:
    all var(--ft-transition-fast),
    transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.app-shell__logout-btn:hover {
  color: var(--ft-danger-400);
  background: color-mix(in srgb, var(--ft-danger-500) 8%, transparent);
  border-color: color-mix(in srgb, var(--ft-danger-500) 25%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--ft-danger-500) 12%, transparent);
}

.app-shell__logout-btn i {
  font-size: 1.1rem;
}

.app-shell__sidebar-content,
.app-shell__drawer-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
}

@media (width >= 1024px) {
  .app-shell__sidebar-desktop {
    position: sticky;
    top: var(--app-shell-nav-height);

    overflow-y: auto;
    display: block;
    grid-area: sidebar;

    height: calc(100vh - var(--app-shell-nav-height));
    padding: var(--ft-space-6) var(--ft-space-4);

    background: linear-gradient(
      180deg,
      var(--ft-surface-base),
      color-mix(in srgb, var(--ft-bg-subtle) 90%, var(--ft-surface-base))
    );
    border-right: 1px solid var(--ft-border-default);

    transition: padding 0.2s ease;
  }

  .app-shell__sidebar-desktop--collapsed {
    overflow: visible;
    padding: var(--ft-space-6) var(--ft-space-2);
  }

  .app-shell__sidebar-desktop--collapsed .app-shell__sidebar-user {
    display: none;
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

  .app-shell__logo-icon {
    width: 36px;
    height: 36px;
  }

  .app-shell__logo-icon i {
    font-size: 1.1rem;
  }

  .app-shell__logo-text {
    font-size: var(--ft-text-lg);
  }
}
</style>
