import { computed, onMounted, ref } from 'vue'

type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'fintree-theme'
const DEFAULT_THEME: ThemeMode = 'dark'

let isInitialized = false

const resolveStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    return DEFAULT_THEME
  }
  return DEFAULT_THEME
}

const applyThemeClass = (value: ThemeMode) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark-mode', value === 'dark')
  root.classList.toggle('light-mode', value === 'light')
}

export function useTheme() {
  const theme = ref<ThemeMode>(resolveStoredTheme())

  const setTheme = (value: ThemeMode) => {
    theme.value = value
    applyThemeClass(value)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, value)
      } catch {
        // Ignore storage errors (e.g., privacy mode)
      }
    }
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  const initTheme = () => {
    if (isInitialized) return
    const resolved = resolveStoredTheme()
    theme.value = resolved
    applyThemeClass(resolved)
    isInitialized = true
  }

  onMounted(initTheme)

  return {
    theme: computed(() => theme.value),
    setTheme,
    toggleTheme,
    initTheme,
  }
}
