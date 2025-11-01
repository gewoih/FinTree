import { ref, onMounted } from 'vue'

export function useTheme() {
  const darkMode = ref(false)

  const initTheme = () => {
    const savedTheme = localStorage.getItem('fintree-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    darkMode.value = savedTheme === 'dark' || (!savedTheme && prefersDark)
    applyTheme()
  }

  const toggleTheme = () => {
    darkMode.value = !darkMode.value
    applyTheme()
    localStorage.setItem('fintree-theme', darkMode.value ? 'dark' : 'light')
  }

  const applyTheme = () => {
    document.documentElement.classList.toggle('dark-mode', darkMode.value)
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
