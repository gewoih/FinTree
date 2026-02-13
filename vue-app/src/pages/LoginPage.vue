<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const telegramMount = ref<HTMLElement | null>(null)
const telegramScript = ref<HTMLScriptElement | null>(null)

const isDisabled = computed(() => !email.value || !password.value || authStore.isLoading)

onMounted(() => {
  authStore.clearError()
  if (authStore.isAuthenticated) {
    void router.push('/analytics')
  }

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

const handleLogin = async () => {
  if (isDisabled.value) return
  const success = await authStore.login({
    email: email.value,
    password: password.value
  })

  if (success) {
    router.push('/analytics')
  }
}
</script>

<template>
  <div class="auth auth--login">
    <div class="auth__theme-toggle">
      <ThemeToggle />
    </div>
    <div class="auth__container">
      <div class="auth__intro">
        <router-link
          to="/"
          class="auth__brand"
        >
          <i class="pi pi-chart-bar" />
          <span>FinTree</span>
        </router-link>
        <h1>Вход в FinTree</h1>
        <p>Продолжайте вести учёт расходов через Telegram и получать понятную аналитику в вебе.</p>
      </div>

      <UiCard
        class="auth__card"
        variant="muted"
        padding="lg"
      >
        <form
          class="auth__form"
          @submit.prevent="handleLogin"
        >
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

          <p
            v-if="authStore.error"
            class="auth__error"
          >
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

        <div class="auth__divider">
          <span>или</span>
        </div>

        <div class="auth__telegram">
          <p>Войти через Telegram</p>
          <div
            ref="telegramMount"
            class="auth__telegram-widget"
          />
        </div>

        <footer class="auth__footer">
          <span>Нет аккаунта?</span>
          <router-link to="/register">
            Создать бесплатно
          </router-link>
        </footer>
      </UiCard>
    </div>
  </div>
</template>

<style scoped>
.auth {
  position: relative;

  display: grid;
  place-items: center;

  min-height: 100vh;
  padding: clamp(var(--ft-space-6), 6vw, var(--ft-space-10)) clamp(var(--ft-space-4), 6vw, var(--ft-space-8));

  color: var(--ft-text-primary);

  background:
    radial-gradient(
      760px 560px at 12% -10%,
      color-mix(in srgb, var(--ft-primary-500) 28%, transparent),
      transparent
    ),
    radial-gradient(
      700px 520px at 88% 8%,
      color-mix(in srgb, var(--ft-info-500) 12%, transparent),
      transparent
    ),
    linear-gradient(180deg, var(--ft-bg-base) 0%, var(--ft-bg-muted) 100%);
}

.auth__theme-toggle {
  position: absolute;
  z-index: 1;
  top: clamp(var(--ft-space-4), 4vw, var(--ft-space-6));
  right: clamp(var(--ft-space-4), 4vw, var(--ft-space-6));
}

.auth__container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: clamp(var(--ft-space-6), 6vw, var(--ft-space-8));
  align-items: center;

  width: 100%;
  max-width: var(--ft-container-xl);
}

.auth__intro {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  max-width: 52ch;
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

.auth__brand i {
  font-size: 1.25rem;
}

.auth__intro h1 {
  margin: 0;
  font-family: var(--ft-font-display);
  font-size: clamp(2rem, 4vw, 2.75rem);
}

.auth__intro p {
  max-width: 44ch;
  margin: 0;
  line-height: 1.6;
  color: var(--ft-text-secondary);
}

.auth__card {
  justify-self: end;

  width: min(420px, 100%);

  background: var(--ft-surface-base);
  backdrop-filter: blur(18px);
  border: 1px solid var(--ft-border-subtle);
  box-shadow: var(--ft-shadow-xl);
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

.auth__divider {
  position: relative;

  display: grid;
  place-items: center;

  margin: var(--ft-space-2) 0;

  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.auth__divider::before {
  content: '';

  position: absolute;
  inset: 50% 0 auto;

  height: 1px;

  opacity: 0.6;
  background: var(--ft-border-subtle);
}

.auth__divider span {
  position: relative;
  padding: 0 var(--ft-space-3);
  background: var(--ft-surface-base);
}

.auth__telegram {
  display: grid;
  gap: var(--ft-space-2);
  justify-items: center;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  text-align: center;
}

.auth__telegram p {
  margin: 0;
}

.auth__telegram-widget :deep(script) {
  display: block;
}

.auth__footer a {
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
  text-decoration: none;
}

.auth__footer a:hover {
  text-decoration: underline;
}

.light-mode .auth__brand {
  color: var(--ft-primary-700);
}

@media (width <= 768px) {
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

@media (width >= 1024px) {
  .auth__container {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
    justify-content: space-between;
  }
}
</style>
