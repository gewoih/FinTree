<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')

const hasPasswordInput = computed(() => password.value.length > 0)

const passwordRules = computed(() => {
  const value = password.value

  return [
    { key: 'length', label: 'Минимум 8 символов', met: value.length >= 8 },
    { key: 'digit', label: 'Хотя бы 1 цифра', met: /\d/.test(value) },
    { key: 'lower', label: 'Хотя бы 1 строчная буква', met: /[a-z]/.test(value) },
    { key: 'upper', label: 'Хотя бы 1 заглавная буква', met: /[A-Z]/.test(value) },
    { key: 'symbol', label: 'Хотя бы 1 спецсимвол', met: /[^a-zA-Z0-9]/.test(value) },
  ]
})

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
    <div class="auth__theme-toggle">
      <ThemeToggle />
    </div>
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
            <ul
              v-if="hasPasswordInput"
              class="auth__password-hints"
            >
              <li
                v-for="rule in passwordRules"
                :key="rule.key"
                :class="[
                  'auth__password-rule',
                  { 'auth__password-rule--ok': rule.met, 'auth__password-rule--warn': hasPasswordInput && !rule.met }
                ]"
              >
                <i :class="rule.met ? 'pi pi-check' : hasPasswordInput ? 'pi pi-times' : 'pi pi-circle'" />
                <span>{{ rule.label }}</span>
              </li>
            </ul>
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
  position: relative;

  overflow: hidden;
  display: grid;
  place-items: center;

  min-height: 100vh;
  padding: clamp(var(--ft-space-6), 6vw, var(--ft-space-12)) clamp(var(--ft-space-4), 6vw, var(--ft-space-10));

  color: var(--ft-text-primary);

  background:
    radial-gradient(
      820px 620px at 12% -12%,
      color-mix(in srgb, var(--ft-primary-500) 30%, transparent),
      transparent
    ),
    radial-gradient(
      720px 540px at 88% 8%,
      color-mix(in srgb, var(--ft-info-500) 12%, transparent),
      transparent
    ),
    linear-gradient(180deg, var(--ft-bg-base) 0%, var(--ft-bg-muted) 100%);
}

.auth__theme-toggle {
  position: absolute;
  z-index: 2;
  top: clamp(var(--ft-space-4), 4vw, var(--ft-space-6));
  right: clamp(var(--ft-space-4), 4vw, var(--ft-space-6));
}

.auth__gradient {
  pointer-events: none;

  position: absolute;
  inset: 0;

  opacity: 0.7;
  background:
    radial-gradient(
      60% 60% at 80% 90%,
      color-mix(in srgb, var(--ft-primary-500) 18%, transparent),
      transparent
    ),
    radial-gradient(
      40% 40% at 20% 70%,
      color-mix(in srgb, var(--ft-info-500) 8%, transparent),
      transparent
    );
}

.auth__container {
  position: relative;
  z-index: 1;

  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: clamp(var(--ft-space-6), 6vw, var(--ft-space-10));
  align-items: center;

  width: 100%;
  max-width: var(--ft-container-xl);
}

.auth__intro {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.auth__brand {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-family: var(--ft-font-display);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-primary-200);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.auth__intro h1 {
  margin: 0;
  font-family: var(--ft-font-display);
  font-size: clamp(2rem, 4vw, 2.75rem);
}

.auth__intro p {
  max-width: 48ch;
  margin: 0;
  line-height: 1.6;
  color: var(--ft-text-secondary);
}

.auth__benefits {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);

  margin: 0;
  padding: 0;

  color: var(--ft-text-secondary);
  list-style: none;
}

.auth__benefits li {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.auth__benefits i {
  color: var(--ft-success-400);
}

.auth__card {
  width: min(460px, 100%);

  background: var(--ft-surface-base);
  backdrop-filter: blur(18px);
  border: 1px solid var(--ft-border-subtle);
  box-shadow: var(--ft-shadow-xl);
}

.light-mode .auth__brand {
  color: var(--ft-primary-700);
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
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.auth__field small {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.auth__password-hints {
  display: grid;
  gap: var(--ft-space-1);

  margin: 0;
  padding: 0;

  list-style: none;
}

.auth__password-rule {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.auth__password-rule i {
  font-size: 0.75rem;
}

.auth__password-rule--ok {
  color: var(--ft-success-400);
}

.auth__password-rule--warn {
  color: var(--ft-danger-400);
}

.auth__error {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  margin: 0;

  font-size: var(--ft-text-sm);
  color: var(--ft-danger-400);
}

.auth__footer {
  display: flex;
  gap: var(--ft-space-2);
  justify-content: center;

  margin-top: var(--ft-space-4);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.auth__footer a {
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
  text-decoration: none;
}

.auth__footer a:hover {
  text-decoration: underline;
}

@media (width <= 768px) {
  .auth {
    padding-block: clamp(var(--ft-space-6), 8vw, var(--ft-space-8));
  }

  .auth__container {
    grid-template-columns: 1fr;
  }
}
</style>
