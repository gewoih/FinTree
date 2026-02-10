<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')

const validationError = computed(() => {
  if (!password.value || !passwordConfirmation.value) return null
  return password.value !== passwordConfirmation.value ? 'Пароли не совпадают' : null
})

const isDisabled = computed(() => {
  return authStore.isLoading || Boolean(validationError.value) || !email.value || !password.value
})

onMounted(() => {
  authStore.clearError()
  if (authStore.isAuthenticated) {
    void router.push('/analytics')
  }
})

const handleRegister = async () => {
  if (isDisabled.value) return
  const success = await authStore.register({
    email: email.value,
    password: password.value,
    passwordConfirmation: passwordConfirmation.value
  })

  if (success) {
    router.push('/analytics')
  }
}
</script>

<template>
  <div class="auth auth--register">
    <div
      class="auth__gradient"
      aria-hidden="true"
    />

    <div class="auth__container">
      <div class="auth__intro">
        <router-link
          to="/"
          class="auth__brand"
        >
          <i class="pi pi-chart-bar" />
          <span>FinTree</span>
        </router-link>
        <h1>Создайте аккаунт FinTree</h1>
        <p>Учёт расходов через Telegram и аналитика бюджета — всё в одном простом интерфейсе.</p>
        <ul class="auth__benefits">
          <li><i class="pi pi-check" />1 месяц бесплатного доступа</li>
          <li><i class="pi pi-check" />Быстрый ввод трат через @financetree_bot</li>
          <li><i class="pi pi-check" />Никаких подключений к банкам</li>
        </ul>
      </div>

      <AppCard
        class="auth__card"
        variant="muted"
        padding="lg"
        elevated
      >
        <form
          class="auth__form"
          @submit.prevent="handleRegister"
        >
          <div class="auth__field">
            <label for="email">Email</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="name@domain.com"
              autocomplete="email"
            />
          </div>

          <div class="auth__field">
            <label for="password">Пароль</label>
            <InputText
              id="password"
              v-model="password"
              type="password"
              placeholder="Минимум 8 символов"
              autocomplete="new-password"
            />
            <small>Используйте минимум 8 символов и смешайте регистры для лучшей защиты.</small>
          </div>

          <div class="auth__field">
            <label for="passwordConfirmation">Подтвердите пароль</label>
            <InputText
              id="passwordConfirmation"
              v-model="passwordConfirmation"
              type="password"
              placeholder="Введите пароль повторно"
              autocomplete="new-password"
            />
          </div>

          <p
            v-if="validationError"
            class="auth__error"
          >
            <i class="pi pi-exclamation-circle" />
            <span>{{ validationError }}</span>
          </p>

          <p
            v-if="authStore.error"
            class="auth__error"
          >
            <i class="pi pi-exclamation-circle" />
            <span>{{ authStore.error }}</span>
          </p>

          <AppButton
            type="submit"
            label="Зарегистрироваться"
            icon="pi pi-user-plus"
            :loading="authStore.isLoading"
            :disabled="isDisabled"
            block
          />
        </form>

        <footer class="auth__footer">
          <span>Уже есть аккаунт?</span>
          <router-link to="/login">
            Войти
          </router-link>
        </footer>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(var(--ft-space-6), 6vw, var(--ft-space-12)) clamp(var(--ft-space-4), 6vw, var(--ft-space-10));
  background: radial-gradient(120% 120% at -10% 10%, rgba(59, 130, 246, 0.22), rgba(15, 20, 25, 0.92)),
    linear-gradient(160deg, rgba(15, 20, 25, 1) 0%, rgba(17, 24, 39, 1) 100%);
  color: var(--ft-text-primary);
  position: relative;
  overflow: hidden;
}

.auth__gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 60% at 100% 100%, rgba(59, 130, 246, 0.18), transparent),
    radial-gradient(40% 40% at 20% 80%, rgba(236, 72, 153, 0.18), transparent);
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

.auth__intro h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.75rem);
}

.auth__intro p {
  margin: 0;
  color: var(--ft-text-secondary);
  max-width: 48ch;
  line-height: 1.6;
}

.auth__benefits {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  margin: 0;
  padding: 0;
  color: var(--ft-text-secondary);
}

.auth__benefits li {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.auth__benefits i {
  color: var(--ft-success-400);
}

.auth__card {
  width: min(460px, 100%);
  backdrop-filter: blur(18px);
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

.auth__field small {
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-xs);
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
}
</style>
