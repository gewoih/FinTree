<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../../composables/useTheme'

const { theme, toggleTheme } = useTheme()

const isDark = computed(() => theme.value === 'dark')
const iconClass = computed(() => (isDark.value ? 'pi pi-sun' : 'pi pi-moon'))
const label = computed(() =>
  isDark.value ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'
)
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="label"
    :aria-pressed="isDark"
    :title="label"
    @click="toggleTheme"
  >
    <i
      :class="iconClass"
      aria-hidden="true"
    />
    <span class="sr-only">{{ label }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  cursor: pointer;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 44px;
  height: 44px;

  color: var(--ft-text-primary);

  background: color-mix(in srgb, var(--ft-primary-500) 12%, transparent);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-full);

  transition:
    transform var(--ft-transition-fast),
    background-color var(--ft-transition-fast),
    border-color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.theme-toggle:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--ft-primary-500) 18%, transparent);
  border-color: var(--ft-border-default);
  box-shadow: var(--ft-shadow-sm);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--ft-focus-ring);
  outline-offset: 3px;
}

.theme-toggle i {
  font-size: 1.1rem;
}
</style>
