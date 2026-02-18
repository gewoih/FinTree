import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.ts'
import { useUserStore } from '@/stores/user.ts'
import { useTheme } from '@/composables/useTheme.ts'
import { useViewport } from '@/composables/useViewport.ts'

export function useAppShellState() {
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const router = useRouter()
  const route = useRoute()
  const { isTablet } = useViewport()
  const { initTheme } = useTheme()

  const getInitialSidebarCollapsed = () =>
    typeof localStorage !== 'undefined' && localStorage.getItem('ft-sidebar-collapsed') === '1'

  const sidebarVisible = ref(false)
  const sidebarCollapsed = ref(getInitialSidebarCollapsed())

  const userDisplayName = computed(() => {
    const name = userStore.currentUser?.name?.trim()
    if (name) return name
    return authStore.userEmail ?? 'Аккаунт'
  })

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
  })

  return {
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
  }
}
