<script setup lang="ts">
const emit = defineEmits<{ create: [] }>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <i class="pi pi-bullseye" />
    </div>

    <h3>Нет целей</h3>
    <p>Создайте первую финансовую цель и получите прогноз на основе ваших данных.</p>

    <button
      type="button"
      class="create-btn"
      @click="emit('create')"
    >
      + Новая цель
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  align-items: center;
  justify-content: center;

  height: 100%;
  min-height: 300px;
  padding: var(--ft-space-8);

  text-align: center;
}

.empty-icon {
  font-size: var(--ft-text-4xl);
  color: var(--ft-text-tertiary);
  opacity: 0.45;
}

.empty-state h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.empty-state p {
  max-width: 320px;
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.create-btn {
  cursor: pointer;

  padding: var(--ft-space-3) var(--ft-space-6);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-inverse);

  background: var(--ft-primary-400);
  border: none;
  border-radius: var(--ft-radius-md);

  transition: background var(--ft-transition-fast);
}

.create-btn:hover {
  background: var(--ft-primary-300);
}

.create-btn:focus-visible {
  outline: 2px solid var(--ft-primary-300);
  outline-offset: 2px;
}
</style>
