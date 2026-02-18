<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import UiButton from '../ui/UiButton.vue'
import UiCard from '../ui/UiCard.vue'
import UiInputText from '../ui/UiInputText.vue'
import ThemeToggle from '../components/common/ThemeToggle.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const telegramMount = ref<HTMLElement | null>(null)
const telegramScript = ref<HTMLScriptElement | null>(null)
const telegramLoaded = ref(false)

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

  script.onload = () => {
    telegramLoaded.value = true
  }

  script.onerror = () => {
    telegramLoaded.value = false
  }

  mount.appendChild(script)
  telegramScript.value = script

  setTimeout(() => {
    if (!telegramLoaded.value) {
      telegramLoaded.value = false
    }
  }, 5000)
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
  <div class="auth">
    <div class="auth__theme-toggle">
      <ThemeToggle />
    </div>

    <div class="auth__center">
      <router-link
        to="/"
        class="auth__brand"
      >
        <i class="pi pi-chart-bar" />
        <span>FinTree</span>
      </router-link>

      <h1 class="auth__title">
        С возвращением!
      </h1>

      <UiCard
        class="auth__card"
        variant="muted"
        padding="lg"
      >
        <div class="auth__telegram">
          <p class="auth__telegram-label">
            Войти через Telegram
          </p>
          <div
            ref="telegramMount"
            class="auth__telegram-widget"
          />
          <p
            v-if="telegramLoaded === false && !telegramScript"
            class="auth__telegram-fallback"
          >
            Виджет Telegram не загрузился. Используйте Email-вход ниже.
          </p>
        </div>

        <div class="auth__divider">
          <span>или через Email</span>
        </div>

        <form
          class="auth__form"
          @submit.prevent="handleLogin"
        >
          <div class="auth__field">
            <label for="login-email">Email</label>
            <UiInputText
              id="login-email"
              v-model="email"
              type="email"
              placeholder="name@domain.com"
              autocomplete="email"
            />
          </div>

          <div class="auth__field">
            <label for="login-password">Пароль</label>
            <div class="auth__password-wrap">
              <UiInputText
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Введите пароль"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="auth__eye"
                :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
                tabindex="-1"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
              </button>
            </div>
            <router-link
              to="/forgot-password"
              class="auth__forgot-link"
            >
              Забыли пароль?
            </router-link>
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
            :loading="authStore.isLoading"
            :disabled="isDisabled"
            block
          />
        </form>

        <footer class="auth__footer">
          <span>Нет аккаунта?</span>
          <router-link to="/register">
            Зарегистрироваться
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
      760px 560px at 50% -10%,
      color-mix(in srgb, var(--ft-primary-500) 24%, transparent),
      transparent
    ),
    linear-gradient(180deg, var(--ft-bg-base) 0%, var(--ft-bg-muted) 100%);
}

.auth__theme-toggle {
  position: absolute;
  z-index: var(--ft-z-above);
  top: clamp(var(--ft-space-4), 4vw, var(--ft-space-6));
  right: clamp(var(--ft-space-4), 4vw, var(--ft-space-6));
}

.auth__center {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  align-items: center;

  width: 100%;
  max-width: 420px;

  text-align: center;
}

.auth__brand {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-family: var(--ft-font-display);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-auth-brand-color);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.auth__title {
  margin: 0;
  font-family: var(--ft-font-display);
  font-size: clamp(1.5rem, 4vw, 2rem);
  line-height: 1.2;
}

.auth__card {
  width: 100%;

  background: var(--ft-surface-base);
  backdrop-filter: blur(18px);
  border: 1px solid var(--ft-border-subtle);
  box-shadow: var(--ft-shadow-xl);
}

.auth__telegram {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
  align-items: center;

  text-align: center;
}

.auth__telegram-label {
  margin: 0;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.auth__telegram-widget {
  display: flex;
  justify-content: center;
  min-height: 44px;
}

.auth__telegram-fallback {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
}

.auth__divider {
  position: relative;

  display: grid;
  place-items: center;

  margin: var(--ft-space-1) 0;

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

.auth__form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  text-align: left;
}

.auth__field > label {
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.auth__password-wrap {
  position: relative;
}

.auth__password-wrap :deep(input) {
  padding-right: var(--ft-space-10);
}

.auth__eye {
  cursor: pointer;

  position: absolute;
  top: 50%;
  right: var(--ft-space-3);
  transform: translateY(-50%);

  display: grid;
  place-items: center;

  padding: 0;

  font-size: 1rem;
  color: var(--ft-text-tertiary);

  background: none;
  border: none;

  transition: color var(--ft-transition-fast);
}

.auth__eye:hover {
  color: var(--ft-text-primary);
}

.auth__forgot-link {
  align-self: flex-end;

  font-size: var(--ft-text-xs);
  color: var(--ft-text-secondary);
  text-decoration: none;

  transition: color var(--ft-transition-fast);
}

.auth__forgot-link:hover {
  color: var(--ft-text-primary);
  text-decoration: underline;
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

  margin-top: var(--ft-space-2);

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
</style>
