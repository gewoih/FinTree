<script setup lang="ts">
import { useRouter } from 'vue-router';

defineProps<{
  title: string;
  subtitle?: string;
}>();

const router = useRouter();
const currentYear = new Date().getFullYear();
</script>

<template>
  <div class="public-page">
    <header class="public-page__header">
      <router-link
        to="/"
        class="public-page__brand"
      >
        <i class="pi pi-chart-bar" />
        <span>FinTree</span>
      </router-link>

      <div class="public-page__actions">
        <ThemeToggle />
        <AppButton
          variant="ghost"
          label="Войти"
          @click="router.push('/login')"
        />
        <AppButton
          label="Регистрация"
          @click="router.push('/register')"
        />
      </div>
    </header>

    <main class="public-page__main">
      <div class="public-page__container">
        <div class="public-page__title">
          <h1>{{ title }}</h1>
          <p v-if="subtitle">
            {{ subtitle }}
          </p>
        </div>

        <div class="public-page__content">
          <slot />
        </div>
      </div>
    </main>

    <footer class="public-page__footer">
      <span>© {{ currentYear }} FinTree</span>
      <div class="public-page__footer-links">
        <router-link to="/privacy">
          Политика
        </router-link>
        <router-link to="/terms">
          Условия
        </router-link>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.public-page {
  display: grid;
  grid-template-rows: auto 1fr auto;

  min-height: 100vh;

  color: var(--ft-text-primary);

  background:
    radial-gradient(
      820px 620px at 12% -12%,
      color-mix(in srgb, var(--ft-primary-500) 26%, transparent),
      transparent
    ),
    radial-gradient(
      700px 520px at 88% 8%,
      color-mix(in srgb, var(--ft-info-500) 12%, transparent),
      transparent
    ),
    linear-gradient(180deg, var(--ft-bg-base) 0%, var(--ft-bg-muted) 100%);
}

.public-page__header {
  display: flex;
  gap: var(--ft-space-4);
  align-items: center;
  justify-content: space-between;

  padding: clamp(var(--ft-space-4), 4vw, var(--ft-space-6)) clamp(var(--ft-space-4), 5vw, var(--ft-space-8));

  background: color-mix(in srgb, var(--ft-bg-base) 85%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.public-page__brand {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-family: var(--ft-font-display);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  text-decoration: none;
}

.public-page__brand i {
  color: var(--ft-primary-400);
}

.public-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  align-items: center;
}

.public-page__main {
  padding: clamp(var(--ft-space-6), 5vw, var(--ft-space-10)) 0;
}

.public-page__container {
  display: grid;
  gap: var(--ft-space-6);

  width: 100%;
  max-width: var(--ft-container-lg);
  margin: 0 auto;
  padding: 0 clamp(var(--ft-space-4), 5vw, var(--ft-space-8));
}

.public-page__title h1 {
  margin: 0;
  font-family: var(--ft-font-display);
  font-size: clamp(2rem, 4vw, 2.75rem);
}

.public-page__title p {
  max-width: 60ch;
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
}

.public-page__content {
  display: grid;
  gap: var(--ft-space-5);
}

.public-page__footer {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: space-between;

  padding: var(--ft-space-4) clamp(var(--ft-space-4), 5vw, var(--ft-space-8));

  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);

  border-top: 1px solid color-mix(in srgb, var(--ft-border-default) 50%, transparent);
}

.public-page__footer-links {
  display: flex;
  gap: var(--ft-space-3);
}

.public-page__footer-links a {
  color: inherit;
  text-decoration: none;
}

.public-page__footer-links a:hover {
  color: var(--ft-text-primary);
}

@media (width <= 640px) {
  .public-page__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .public-page__actions {
    justify-content: flex-start;
    width: 100%;
  }

  .public-page__footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
