import { ref, onMounted } from 'vue'

export function useTheme() {
  const darkMode = ref(true) // Always dark mode

  const initTheme = () => {
    // Force dark mode always
    darkMode.value = true
    applyTheme()
  }

  const toggleTheme = () => {
    // Keep dark mode always on
    darkMode.value = true
    applyTheme()
  }

  const applyTheme = () => {
    // Always apply dark mode class
    document.documentElement.classList.add('dark-mode')
  }

  onMounted(() => {
    initTheme()
  })

  return {
    darkMode,
    toggleTheme,
    initTheme
  }
}
