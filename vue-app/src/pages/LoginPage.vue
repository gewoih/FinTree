<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import UiButton from '../ui/UiButton.vue'
import UiCard from '../ui/UiCard.vue'
import UiInputText from '../ui/UiInputText.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')

const isDisabled = computed(() => !email.value || !password.value || authStore.isLoading)

onMounted(() => {
  authStore.clearError()
  if (authStore.isAuthenticated) {
    void router.push('/dashboard')
  }
})

const handleLogin = async () => {
  if (isDisabled.value) return
  const success = await authStore.login({
    email: email.value,
    password: password.value
  })

  if (success) {
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="auth auth--login">
    <div class="auth__gradient" aria-hidden="true"></div>

    <div class="auth__container">
      <div class="auth__intro">
        <router-link to="/" class="auth__brand">
          <i class="pi pi-chart-bar" />
          <span>FinTree</span>
        </router-link>
        <h1>С возвращением 👋</h1>
        <p>Войдите в пространство аналитики и продолжайте путь к финансовой стабильности.</p>
      </div>

      <UiCard class="auth__card" variant="muted" padding="lg">
        <form class="auth__form" @submit.prevent="handleLogin">
          <div class="auth__field">
            <label for="email">Email</label>
            <UiInputText
              id="email"
              v-model="email"
              type="email"
              placeholder="name@domain.com"
              autocomplete="email"
            />
          </div>

          <div class="auth__field">
            <label for="password">Пароль</label>
            <UiInputText
              id="password"
              v-model="password"
              type="password"
              placeholder="Введите пароль"
              autocomplete="current-password"
            />
          </div>

          <p v-if="authStore.error" class="auth__error">
            <i class="pi pi-exclamation-circle" />
            <span>{{ authStore.error }}</span>
          </p>

          <UiButton
            type="submit"
            label="Войти"
            icon="pi pi-log-in"
            :loading="authStore.isLoading"
            :disabled="isDisabled"
            block
          />
        </form>

        <footer class="auth__footer">
          <span>Нет аккаунта?</span>
          <router-link to="/register">Создать бесплатно</router-link>
        </footer>
      </UiCard>
    </div>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(var(--ft-space-6), 6vw, var(--ft-space-12)) clamp(var(--ft-space-4), 6vw, var(--ft-space-10));
  background: radial-gradient(120% 120% at 100% 0%, rgba(59, 130, 246, 0.2), rgba(15, 20, 25, 0.9)),
    linear-gradient(180deg, rgba(15, 20, 25, 0.96) 0%, rgba(15, 20, 25, 1) 100%);
  color: var(--ft-text-primary);
  position: relative;
  overflow: hidden;
}

.auth__gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 60% at 0% 100%, rgba(15, 118, 110, 0.18), transparent),
    radial-gradient(50% 50% at 80% 20%, rgba(236, 72, 153, 0.2), transparent);
  opacity: 0.6;
  pointer-events: none;
}

.auth__container {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: clamp(var(--ft-space-6), 6vw, var(--ft-space-10));
  align-items: center;
  z-index: 1;
  max-width: var(--ft-container-xl);
  width: 100%;
}

.auth__intro {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  max-width: 52ch;
}

.auth__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-primary-300);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.auth__brand i {
  font-size: 1.25rem;
}

.auth__intro h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.75rem);
}

.auth__intro p {
  margin: 0;
  color: var(--ft-text-secondary);
  max-width: 44ch;
  line-height: 1.6;
}

.auth__card {
  width: min(420px, 100%);
  backdrop-filter: blur(18px);
  justify-self: end;
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.auth__field label {
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--ft-text-tertiary);
}

.auth__error {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-danger-400);
}

.auth__footer {
  display: flex;
  justify-content: center;
  gap: var(--ft-space-2);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  margin-top: var(--ft-space-4);
}

.auth__footer a {
  color: var(--ft-text-primary);
  font-weight: var(--ft-font-medium);
  text-decoration: none;
}

.auth__footer a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .auth {
    padding-block: clamp(var(--ft-space-6), 8vw, var(--ft-space-8));
  }

  .auth__container {
    grid-template-columns: 1fr;
  }

  .auth__card {
    justify-self: center;
  }
}

@media (min-width: 1024px) {
  .auth__container {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
    justify-content: space-between;
  }
}
</style>
