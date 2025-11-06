import { onMounted } from 'vue'

export function useTheme() {
  const applyDarkTheme = () => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.add('dark-mode')
  }

  const initTheme = () => {
    applyDarkTheme()
  }

  onMounted(() => {
    initTheme()
  })

  return {
    initTheme
  }
}
