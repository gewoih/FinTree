import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

export function useViewport() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
  const height = ref(typeof window !== 'undefined' ? window.innerHeight : 720)

  const update = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', update)
  })

  const isMobile = computed(() => width.value <= 640)
  const isTablet = computed(() => width.value < 1024)

  return {
    width,
    height,
    isMobile,
    isTablet,
  }
}
