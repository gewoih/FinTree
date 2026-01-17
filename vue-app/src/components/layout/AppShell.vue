<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useTheme } from '../../composables/useTheme'
import UiButton from '../../ui/UiButton.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const sidebarVisible = ref(false)
const isDesktop = ref(true)
const userMenuRef = ref<{ toggle: (event: Event) => void } | null>(null)

const { initTheme } = useTheme()

const userEmail = computed(() => authStore.userEmail ?? 'Аккаунт')

const navigationItems = [
  { label: 'Дашборд', icon: 'pi-home', to: '/dashboard' },
  { label: 'Счета', icon: 'pi-wallet', to: '/accounts' },
  { label: 'Транзакции', icon: 'pi-list', to: '/expenses' },
  { label: 'Категории', icon: 'pi-tags', to: '/categories' },
  { label: 'Аналитика', icon: 'pi-chart-line', to: '/analytics' },
  { label: 'План доходов', icon: 'pi-chart-bar', to: '/future-income' },
  { label: 'Профиль', icon: 'pi-cog', to: '/profile' }
]

const userMenuItems = [
  { label: 'Профиль', icon: 'pi pi-user', command: () => router.push('/profile') },
  { label: 'Настройки', icon: 'pi pi-cog', command: () => router.push('/profile') },
  { separator: true },
  { label: 'Выйти', icon: 'pi pi-sign-out', command: () => handleLogout() }
]

const updateViewport = () => {
  if (typeof window === 'undefined') return
  isDesktop.value = window.innerWidth >= 1024
  if (isDesktop.value) {
    sidebarVisible.value = false
  }
}

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
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
})
</script>

<template>
  <div class="app-shell">
    <a class="app-shell__skip-link" href="#main-content">Перейти к основному содержимому</a>

    <header class="app-shell__topbar">
      <div class="app-shell__topbar-left">
        <UiButton
          icon="pi pi-bars"
          variant="ghost"
          class="app-shell__menu-toggle"
          @click="toggleSidebar"
        />
        <router-link to="/dashboard" class="app-shell__logo">
          <i class="pi pi-chart-bar" aria-hidden="true" />
          <span>FinTree</span>
        </router-link>
      </div>

      <div class="app-shell__topbar-right">
        <UiButton
          type="button"
          :label="userEmail"
          icon="pi pi-user"
          variant="ghost"
          @click="handleUserMenuToggle"
        />
        <Menu ref="userMenuRef" :model="userMenuItems" popup />
      </div>
    </header>

    <Drawer
      v-if="!isDesktop"
      v-model:visible="sidebarVisible"
      position="left"
      class="app-shell__drawer"
    >
      <template #header>
        <div class="app-shell__drawer-header">
          <i class="pi pi-chart-bar" aria-hidden="true" />
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
          <i :class="['pi', item.icon]" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </Drawer>

    <aside v-if="isDesktop" class="app-shell__sidebar">
      <nav class="app-shell__nav">
        <router-link
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
          class="app-shell__nav-link"
          :aria-current="route.path === item.to ? 'page' : undefined"
        >
          <i :class="['pi', item.icon]" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <main id="main-content" class="app-shell__content" tabindex="-1">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--bg);
  display: grid;
  grid-template-rows: auto 1fr;
  grid-template-columns: 1fr;
  grid-template-areas:
    "topbar"
    "content";
}

@media (min-width: 1024px) {
  .app-shell {
    grid-template-columns: 260px 1fr;
    grid-template-areas:
      "topbar topbar"
      "sidebar content";
  }
}

.app-shell__skip-link {
  position: absolute;
  left: var(--space-4);
  top: -120%;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #fff;
  z-index: 1000;
  transition: top var(--ft-transition-fast);
}

.app-shell__skip-link:focus {
  top: var(--space-4);
}

.app-shell__topbar {
  grid-area: topbar;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-5);
  background: var(--surface-1);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  z-index: 50;
}

.app-shell__topbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.app-shell__topbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.app-shell__menu-toggle {
  display: inline-flex;
}

@media (min-width: 1024px) {
  .app-shell__menu-toggle {
    display: none;
  }
}

.app-shell__logo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text);
  text-decoration: none;
}

.app-shell__logo i {
  color: var(--accent);
}

.app-shell__sidebar {
  grid-area: sidebar;
  background: var(--surface-1);
  border-right: 1px solid var(--border-subtle);
  padding: var(--space-5) var(--space-3);
  position: sticky;
  top: 72px;
  height: calc(100vh - 72px);
  overflow-y: auto;
}

.app-shell__drawer :deep(.p-drawer) {
  width: 280px;
  background: var(--surface-2);
  border-right: 1px solid var(--border-subtle);
}

.app-shell__drawer :deep(.p-drawer-header) {
  padding: var(--space-4);
}

.app-shell__drawer-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
}

.app-shell__drawer-header i {
  color: var(--accent);
}

.app-shell__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.app-shell__nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  text-decoration: none;
  transition: background-color var(--ft-transition-fast), color var(--ft-transition-fast);
}

.app-shell__nav-link:hover {
  background: rgba(59, 130, 246, 0.08);
  color: var(--text);
}

.app-shell__nav-link.router-link-active {
  background: rgba(59, 130, 246, 0.16);
  color: var(--accent);
  font-weight: 600;
}

.app-shell__nav-link i {
  font-size: 1.1rem;
}

.app-shell__content {
  grid-area: content;
  min-width: 0;
  outline: none;
}

.app-shell__topbar-right :deep(.p-menu) {
  min-width: 220px;
  margin-top: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--surface-2);
  box-shadow: var(--shadow-soft);
}

.app-shell__topbar-right :deep(.p-menu .p-menuitem-link) {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
}
</style>
