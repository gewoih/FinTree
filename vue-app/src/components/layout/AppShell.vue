<script setup lang="ts">
import UiDrawer from '@/ui/UiDrawer.vue'
import ThemeToggle from '../common/ThemeToggle.vue'
import UiButton from '../../ui/UiButton.vue'
import BottomTabBar from './BottomTabBar.vue'
import { useAppShellState } from '@/composables/useAppShellState.ts'

const {
  route,
  isTablet,
  sidebarVisible,
  sidebarCollapsed,
  userDisplayName,
  isDrawerVisible,
  isReadOnlyMode,
  subscriptionExpiresAtLabel,
  primaryNavItems,
  secondaryNavItems,
  toggleSidebar,
  handleLogout,
  openSubscription
} = useAppShellState()
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'app-shell--collapsed': !isTablet && sidebarCollapsed }"
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
          icon="pi pi-bars"
          variant="ghost"
          rounded
          class="app-shell__menu-toggle"
          :aria-label="sidebarCollapsed ? 'Показать боковое меню' : 'Скрыть боковое меню'"
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
    <UiDrawer
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
    </UiDrawer>

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

<style scoped src="../../styles/components/app-shell.css"></style>
