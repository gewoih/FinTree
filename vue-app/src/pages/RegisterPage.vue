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
    void router.push('/dashboard')
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
    router.push('/dashboard')
  }
}
</script>

<template>
  <div class="auth auth--register">
    <div class="auth__container">
      <div class="auth__intro">
        <router-link to="/" class="auth__brand">
          <i class="pi pi-chart-bar" />
          <span>FinTree</span>
        </router-link>
        <h1>Создайте аккаунт FinTree</h1>
        <p>Получите доступ к аналитике, автоматизации и персональным трекерам с первого дня.</p>
        <ul class="auth__benefits">
          <li><i class="pi pi-check" />Базовый тариф бесплатен навсегда</li>
          <li><i class="pi pi-check" />Система работает с мультивалютой</li>
          <li><i class="pi pi-check" />Export CSV/PDF по одному клику</li>
        </ul>
      </div>

      <UiCard class="auth__card" variant="muted" padding="lg">
        <form class="auth__form" @submit.prevent="handleRegister">
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
              placeholder="Минимум 8 символов"
              autocomplete="new-password"
            />
            <small>Используйте минимум 8 символов и смешайте регистры для лучшей защиты.</small>
          </div>

          <div class="auth__field">
            <label for="passwordConfirmation">Подтвердите пароль</label>
            <UiInputText
              id="passwordConfirmation"
              v-model="passwordConfirmation"
              type="password"
              placeholder="Введите пароль повторно"
              autocomplete="new-password"
            />
          </div>

          <p v-if="validationError" class="auth__error">
            <i class="pi pi-exclamation-circle" />
            <span>{{ validationError }}</span>
          </p>

          <p v-if="authStore.error" class="auth__error">
            <i class="pi pi-exclamation-circle" />
            <span>{{ authStore.error }}</span>
          </p>

          <UiButton
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
          <router-link to="/login">Войти</router-link>
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
  padding: clamp(var(--space-6), 6vw, var(--space-8)) clamp(var(--space-4), 6vw, var(--space-7));
  background:
    radial-gradient(90% 90% at -10% 0%, rgba(59, 130, 246, 0.2), transparent),
    radial-gradient(80% 80% at 100% 100%, rgba(236, 72, 153, 0.18), transparent),
    var(--bg);
  color: var(--text);
}

.auth__container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: clamp(var(--space-6), 6vw, var(--space-8));
  align-items: center;
  max-width: var(--page-max-width);
  width: 100%;
}

.auth__intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--ft-font-semibold);
  color: var(--accent);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.auth__intro h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.75rem);
}

.auth__intro p {
  margin: 0;
  color: var(--text-muted);
  max-width: 48ch;
  line-height: 1.6;
}

.auth__benefits {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  color: var(--text-muted);
}

.auth__benefits li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.auth__benefits i {
  color: var(--success);
}

.auth__card {
  width: min(460px, 100%);
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.auth__field label {
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.auth__field small {
  color: var(--text-muted);
  font-size: var(--ft-text-xs);
}

.auth__error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--danger);
}

.auth__footer {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--ft-text-sm);
  color: var(--text-muted);
  margin-top: var(--space-4);
}

.auth__footer a {
  color: var(--text);
  font-weight: var(--ft-font-medium);
  text-decoration: none;
}

.auth__footer a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .auth {
    padding-block: clamp(var(--space-6), 8vw, var(--space-7));
  }

  .auth__container {
    grid-template-columns: 1fr;
  }
}
</style>
