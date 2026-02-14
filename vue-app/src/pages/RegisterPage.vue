<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

type RegisterMethod = 'telegram' | 'email'

const registerMethod = ref<RegisterMethod>('telegram')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const telegramMount = ref<HTMLElement | null>(null)
const telegramScript = ref<HTMLScriptElement | null>(null)

const hasPasswordInput = computed(() => password.value.length > 0)

const passwordRules = computed(() => {
  const value = password.value

  return [
    { key: 'length', label: 'Минимум 8 символов', met: value.length >= 8 },
    { key: 'alphanumeric', label: 'Хотя бы 1 буква и 1 цифра', met: /[a-zA-Z]/.test(value) && /\d/.test(value) }
  ]
})

const allRulesMet = computed(() => passwordRules.value.every(rule => rule.met))

const isDisabled = computed(() => {
  return authStore.isLoading || !email.value || !password.value || !allRulesMet.value
})

onMounted(() => {
  authStore.clearError()
  if (authStore.isAuthenticated) {
    void router.push('/analytics')
  }

  // Setup Telegram widget
  const botName = (import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined) ?? 'financetree_bot'
  const mount = telegramMount.value
  if (!mount) return

  const handleTelegramAuth = async (payload: {
    id: number
    auth_date: number
    hash: string
    first_name?: string
    last_name?: string
    username?: string
    photo_url?: string
  }) => {
    const success = await authStore.loginWithTelegram(payload)
    if (success) {
      router.push('/analytics')
    }
  }

  ;(window as Window & { onTelegramAuth?: typeof handleTelegramAuth }).onTelegramAuth = handleTelegramAuth

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.setAttribute('data-telegram-login', botName)
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-radius', '12')
  script.setAttribute('data-userpic', 'false')
  script.setAttribute('data-onauth', 'onTelegramAuth(user)')
  script.setAttribute('data-request-access', 'write')

  mount.appendChild(script)
  telegramScript.value = script
})

onBeforeUnmount(() => {
  const script = telegramScript.value
  if (script?.parentElement) {
    script.parentElement.removeChild(script)
  }
  if ((window as Window & { onTelegramAuth?: unknown }).onTelegramAuth) {
    delete (window as Window & { onTelegramAuth?: unknown }).onTelegramAuth
  }
})

const handleRegister = async () => {
  if (isDisabled.value) return
  const success = await authStore.register({
    email: email.value,
    password: password.value,
    passwordConfirmation: password.value
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
        <h1>Создайте аккаунт за 30 секунд</h1>
        <p>Учёт расходов через Telegram и аналитика бюджета — всё в одном простом интерфейсе.</p>
        <ul class="auth__benefits">
          <li><i class="pi pi-check" />Записывайте траты за 10 секунд в Telegram</li>
          <li><i class="pi pi-check" />Находите скрытые утечки денег</li>
          <li><i class="pi pi-check" />Экономьте в среднем ₽15 000/месяц</li>
        </ul>
        <p class="auth__social-proof">
          500+ человек уже используют FinTree <span class="auth__rating">⭐⭐⭐⭐⭐ 4.9/5</span>
        </p>
      </div>

      <AppCard
        class="auth__card"
        variant="muted"
        padding="lg"
        elevated
      >
        <div class="auth__tabs">
          <button
            type="button"
            class="auth__tab"
            :class="{ 'auth__tab--active': registerMethod === 'telegram' }"
            @click="registerMethod = 'telegram'"
          >
            <i class="pi pi-telegram" />
            <span>Telegram</span>
          </button>
          <button
            type="button"
            class="auth__tab"
            :class="{ 'auth__tab--active': registerMethod === 'email' }"
            @click="registerMethod = 'email'"
          >
            <i class="pi pi-envelope" />
            <span>Email</span>
          </button>
        </div>

        <div
          v-if="registerMethod === 'telegram'"
          class="auth__telegram-register"
        >
          <p class="auth__telegram-title">
            🚀 Быстрая регистрация через Telegram
          </p>
          <p class="auth__telegram-description">
            Нажмите кнопку ниже для регистрации через ваш Telegram аккаунт. Это займет всего 5 секунд.
          </p>
          <div
            ref="telegramMount"
            class="auth__telegram-widget"
          />
          <p class="auth__telegram-hint">
            После регистрации вы сможете записывать траты прямо в Telegram боте @financetree_bot
          </p>
        </div>

        <form
          v-else
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
              :type="showPassword ? 'text' : 'password'"
              placeholder="Минимум 8 символов с буквой и цифрой"
              autocomplete="new-password"
            />
            <div class="auth__password-toggle">
              <input
                id="showPassword"
                v-model="showPassword"
                type="checkbox"
              >
              <label for="showPassword">Показать пароль</label>
            </div>
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

          <p
            v-if="authStore.error"
            class="auth__error"
          >
            <i class="pi pi-exclamation-circle" />
            <span>{{ authStore.error }}</span>
          </p>

          <div class="auth__submit">
            <AppButton
              type="submit"
              label="Получить бесплатный месяц →"
              variant="cta"
              :loading="authStore.isLoading"
              :disabled="isDisabled"
              block
            />
            <p class="auth__disclaimer">
              Без карты. Отменить можно в любой момент.
            </p>
          </div>
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

.auth__social-proof {
  margin: var(--ft-space-2) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.auth__rating {
  display: inline-block;
  margin-left: var(--ft-space-2);
  font-size: var(--ft-text-xs);
  color: var(--ft-text-primary);
  letter-spacing: -0.05em;
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

.auth__tabs {
  display: flex;
  gap: var(--ft-space-2);
  padding: var(--ft-space-1);
  background: var(--ft-surface-muted);
  border-radius: var(--ft-radius-lg);
  margin-bottom: var(--ft-space-5);
}

.auth__tab {
  flex: 1;
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: center;

  padding: var(--ft-space-3) var(--ft-space-4);

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-secondary);

  background: transparent;
  border: none;
  border-radius: var(--ft-radius-md);
  cursor: pointer;

  transition:
    background-color var(--ft-transition-fast),
    color var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.auth__tab:hover {
  color: var(--ft-text-primary);
  background: var(--ft-surface-base);
}

.auth__tab--active {
  color: var(--ft-text-primary);
  background: var(--ft-surface-base);
  box-shadow: var(--ft-shadow-sm);
}

.auth__tab i {
  font-size: 1.1em;
}

.auth__telegram-register {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  align-items: center;
  text-align: center;
}

.auth__telegram-title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
}

.auth__telegram-description {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  max-width: 38ch;
}

.auth__telegram-widget {
  display: flex;
  justify-content: center;
  min-height: 44px;
}

.auth__telegram-hint {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  max-width: 42ch;
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

.auth__password-toggle {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  margin-top: var(--ft-space-1);
}

.auth__password-toggle input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: var(--ft-primary-500);
}

.auth__password-toggle label {
  cursor: pointer;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  text-transform: none;
  letter-spacing: normal;
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

.auth__submit {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.auth__disclaimer {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  text-align: center;
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
