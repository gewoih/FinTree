<template>
  <div class="auth-page">
    <!-- Animated Background Elements -->
    <div class="auth-bg">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <div class="auth-container">
      <!-- Brand Header -->
      <div class="auth-brand">
        <div class="brand-icon">
          <i class="pi pi-tree"></i>
        </div>
        <h1 class="brand-name">FinTree</h1>
        <p class="brand-tagline">Контроль личных финансов</p>
      </div>

      <!-- Register Card -->
      <div class="auth-card">
        <div class="auth-card-header">
          <h2 class="auth-title">Создать аккаунт</h2>
          <p class="auth-subtitle">Начните управлять своими финансами сегодня</p>
        </div>

        <form @submit.prevent="handleRegister" class="auth-form">
          <div class="form-group">
            <label for="email" class="form-label">
              <i class="pi pi-envelope"></i>
              Email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="form-input"
              placeholder="ваш@email.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label for="password" class="form-label">
              <i class="pi pi-lock"></i>
              Пароль
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="form-input"
              placeholder="Минимум 8 символов"
              required
              autocomplete="new-password"
              minlength="8"
            />
            <div class="password-hint">
              <i class="pi pi-info-circle"></i>
              <span>Минимум 8 символов с 4 уникальными символами</span>
            </div>
          </div>

          <div class="form-group">
            <label for="passwordConfirmation" class="form-label">
              <i class="pi pi-check-circle"></i>
              Подтвердите пароль
            </label>
            <input
              id="passwordConfirmation"
              v-model="passwordConfirmation"
              type="password"
              class="form-input"
              :class="{ 'input-error': validationError }"
              placeholder="Введите пароль повторно"
              required
              autocomplete="new-password"
              minlength="8"
            />
          </div>

          <div v-if="validationError" class="error-alert">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ validationError }}</span>
          </div>

          <div v-if="authStore.error" class="error-alert">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ authStore.error }}</span>
          </div>

          <button
            type="submit"
            class="btn-primary btn-gradient"
            :disabled="authStore.isLoading || !!validationError"
          >
            <span v-if="!authStore.isLoading">
              <i class="pi pi-user-plus"></i>
              Зарегистрироваться
            </span>
            <span v-else class="loading-spinner">
              <i class="pi pi-spin pi-spinner"></i>
              Создание аккаунта...
            </span>
          </button>
        </form>

        <div class="auth-divider">
          <span>или</span>
        </div>

        <div class="auth-footer">
          <p class="footer-text">
            Уже есть аккаунт?
            <router-link to="/login" class="auth-link">
              Войти
              <i class="pi pi-arrow-right"></i>
            </router-link>
          </p>
        </div>
      </div>

      <!-- Benefits List -->
      <div class="auth-benefits">
        <div class="benefit-item">
          <i class="pi pi-check"></i>
          <span>Бесплатно навсегда</span>
        </div>
        <div class="benefit-item">
          <i class="pi pi-check"></i>
          <span>Неограниченное количество счетов</span>
        </div>
        <div class="benefit-item">
          <i class="pi pi-check"></i>
          <span>Поддержка мультивалют</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const passwordConfirmation = ref('');

const validationError = computed(() => {
  if (password.value && passwordConfirmation.value && password.value !== passwordConfirmation.value) {
    return 'Пароли не совпадают';
  }
  return null;
});

onMounted(() => {
  authStore.clearError();

  // Redirect if already authenticated
  if (authStore.isAuthenticated) {
    router.push('/');
  }
});

async function handleRegister() {
  if (validationError.value) {
    return;
  }

  const success = await authStore.register({
    email: email.value,
    password: password.value,
    passwordConfirmation: passwordConfirmation.value,
  });

  if (success) {
    router.push('/');
  }
}
</script>

<style scoped>
/* Import all styles from LoginPage */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  position: relative;
  overflow: hidden;
}

.auth-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  animation: float 20s infinite ease-in-out;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--ft-primary), transparent);
  top: -10%;
  left: -10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--ft-secondary), transparent);
  bottom: -10%;
  right: -10%;
  animation-delay: 7s;
}

.orb-3 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, var(--ft-accent), transparent);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: 14s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
}

.auth-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-brand {
  text-align: center;
  animation: fadeIn 0.8s ease-out 0.2s both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.brand-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  background: linear-gradient(135deg, var(--ft-primary), var(--ft-accent));
  border-radius: var(--ft-radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  box-shadow: var(--ft-shadow-lg), var(--ft-shadow-glow);
}

.brand-name {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, var(--ft-primary-light), var(--ft-accent-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-tagline {
  margin: 0.5rem 0 0;
  color: var(--ft-text-muted);
  font-size: 0.9rem;
}

.auth-card {
  background: var(--ft-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--ft-glass-border);
  border-radius: var(--ft-radius-2xl);
  padding: 2.5rem;
  box-shadow: var(--ft-shadow-xl);
  animation: fadeInUp 0.6s ease-out 0.4s both;
}

.auth-card-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ft-text-primary);
  margin: 0 0 0.5rem;
}

.auth-subtitle {
  color: var(--ft-text-muted);
  margin: 0;
  font-size: 0.95rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--ft-text-secondary);
}

.form-label i {
  font-size: 0.875rem;
  color: var(--ft-text-muted);
}

.form-input {
  padding: 0.875rem 1.125rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1.5px solid var(--ft-border);
  border-radius: var(--ft-radius-lg);
  font-size: 1rem;
  color: var(--ft-text-primary);
  transition: all var(--ft-transition-base);
}

.form-input::placeholder {
  color: var(--ft-text-disabled);
}

.form-input:hover {
  border-color: var(--ft-border-hover);
  background: rgba(255, 255, 255, 0.08);
}

.form-input:focus {
  outline: none;
  border-color: var(--ft-primary);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.form-input.input-error {
  border-color: var(--ft-danger);
}

.form-input.input-error:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
}

/* Password Hint */
.password-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--ft-text-muted);
  padding: 0 0.25rem;
}

.password-hint i {
  font-size: 0.875rem;
  color: var(--ft-info);
}

/* Error Alert */
.error-alert {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.125rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--ft-radius-lg);
  color: #fca5a5;
  font-size: 0.875rem;
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.error-alert i {
  font-size: 1.125rem;
  flex-shrink: 0;
}

.btn-primary {
  padding: 1rem 1.5rem;
  border: none;
  border-radius: var(--ft-radius-lg);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all var(--ft-transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
}

.btn-gradient {
  background: linear-gradient(135deg, var(--ft-primary), var(--ft-accent));
  color: white;
  box-shadow: var(--ft-shadow-md);
  position: relative;
  overflow: hidden;
}

.btn-gradient::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--ft-primary-hover), var(--ft-accent));
  opacity: 0;
  transition: opacity var(--ft-transition-base);
}

.btn-gradient:hover:not(:disabled)::before {
  opacity: 1;
}

.btn-gradient:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--ft-shadow-lg), var(--ft-shadow-glow);
}

.btn-gradient:active:not(:disabled) {
  transform: translateY(0);
}

.btn-gradient:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-gradient span {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loading-spinner i {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auth-divider {
  position: relative;
  text-align: center;
  margin: 1.5rem 0;
}

.auth-divider::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: var(--ft-divider);
}

.auth-divider span {
  position: relative;
  padding: 0 1rem;
  background: var(--ft-glass);
  color: var(--ft-text-muted);
  font-size: 0.875rem;
}

.auth-footer {
  text-align: center;
}

.footer-text {
  margin: 0;
  color: var(--ft-text-muted);
  font-size: 0.9375rem;
}

.auth-link {
  color: var(--ft-primary-light);
  text-decoration: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  transition: all var(--ft-transition-base);
  margin-left: 0.375rem;
}

.auth-link:hover {
  color: var(--ft-accent-light);
  gap: 0.625rem;
}

.auth-link i {
  font-size: 0.75rem;
}

/* Benefits List */
.auth-benefits {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  animation: fadeIn 0.8s ease-out 0.6s both;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(8px);
  border: 1px solid var(--ft-glass-border);
  border-radius: var(--ft-radius-lg);
  color: var(--ft-text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  transition: all var(--ft-transition-base);
}

.benefit-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--ft-border-hover);
  transform: translateX(4px);
}

.benefit-item i {
  color: var(--ft-success-light);
  font-size: 1rem;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 640px) {
  .auth-card {
    padding: 2rem 1.5rem;
  }

  .brand-name {
    font-size: 1.75rem;
  }

  .auth-title {
    font-size: 1.5rem;
  }

  .auth-benefits {
    gap: 0.625rem;
  }

  .benefit-item {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
}
</style>
