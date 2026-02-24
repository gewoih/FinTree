<script setup lang="ts">
import { useRouter } from 'vue-router'
import { dashboardScreens, features, pricing } from '@/composables/useLandingPageContent'
import UiButton from '@/ui/UiButton.vue'
import UiCard from '@/ui/UiCard.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import analyticsImage from '@/assets/landing/analytics.png'

const router = useRouter()
const currentYear = new Date().getFullYear()

const openRegister = () => {
  router.push('/register')
}

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div class="landing">
    <header class="landing__nav">
      <div class="landing__nav-inner">
        <router-link
          to="/"
          class="landing__brand"
        >
          <i
            class="pi pi-chart-bar"
            aria-hidden="true"
          />
          <span>FinTree</span>
        </router-link>

        <div class="landing__actions">
          <ThemeToggle />
          <router-link
            to="/login"
            class="landing__login-link"
          >
            Войти
          </router-link>
        </div>
      </div>
    </header>

    <main class="landing__main">
      <!-- Hero -->
      <section
        id="hero"
        class="landing__hero"
      >
        <div class="landing__container landing__hero-layout">
          <div class="landing__hero-copy">
            <h1 class="landing__hero-title">
              0 ₽ в первый месяц.<br>
              Поймите, куда уходят деньги
            </h1>
            <p class="landing__hero-subtitle">
              FinTree собирает расходы в одном месте и сразу показывает, где можно сократить траты без сложных таблиц.
            </p>

            <div class="landing__hero-cta">
              <UiButton
                label="Попробовать бесплатно"
                size="lg"
                variant="cta"
                class="landing__cta-button"
                @click="openRegister()"
              />
              <p class="landing__hero-disclaimer">
                Без привязки карты и скрытых условий.
              </p>
              <p class="landing__hero-proof">
                Без карты • 2 минуты на старт • отмена в любой момент
              </p>
            </div>

            <div class="landing__trust">
              <div class="landing__trust-item">
                <i
                  class="pi pi-lock"
                  aria-hidden="true"
                />
                <span>Данные под защитой</span>
              </div>
              <div class="landing__trust-item">
                <i
                  class="pi pi-bolt"
                  aria-hidden="true"
                />
                <span>Запись расхода за 10 секунд</span>
              </div>
              <div class="landing__trust-item">
                <i
                  class="pi pi-wallet"
                  aria-hidden="true"
                />
                <span>Без банковских интеграций</span>
              </div>
            </div>
          </div>

          <UiCard
            class="landing__hero-shot"
            padding="lg"
            variant="muted"
          >
            <div class="landing__hero-shot-frame">
              <img
                :src="analyticsImage"
                alt="Скриншот главной страницы аналитики в FinTree"
                class="landing__hero-shot-image"
                loading="eager"
                decoding="async"
              >
            </div>
          </UiCard>
        </div>
      </section>

      <!-- Screenshots -->
      <section
        id="screens"
        class="landing__section landing__section--screens"
      >
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>Реальные экраны FinTree</h2>
            <p>Кабинет после регистрации: живые экраны без мокапов.</p>
          </header>

          <div class="card-grid card-grid--auto landing__screens">
            <UiCard
              v-for="screen in dashboardScreens"
              :key="screen.title"
              variant="muted"
              padding="sm"
              class="landing__screen-card"
            >
              <div class="landing__screen-media">
                <img
                  :src="screen.image"
                  :alt="screen.alt"
                  loading="lazy"
                  decoding="async"
                >
              </div>
              <h3>{{ screen.title }}</h3>
              <p>{{ screen.description }}</p>
            </UiCard>
          </div>
        </div>
      </section>

      <!-- Key Benefits -->
      <section
        id="features"
        class="landing__section"
      >
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>Почему FinTree работает</h2>
            <p>Минимум действий — максимум ясности.</p>
          </header>

          <div class="card-grid card-grid--balanced card-grid--dense landing__feature-grid">
            <UiCard
              v-for="feature in features"
              :key="feature.title"
              variant="muted"
              padding="lg"
              class="landing__feature-card"
            >
              <div class="landing__feature-icon">
                <i
                  :class="['pi', feature.icon]"
                  aria-hidden="true"
                />
              </div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </UiCard>
          </div>
        </div>
      </section>

      <!-- Pricing -->
      <section
        id="pricing"
        class="landing__section landing__section--alt"
      >
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>Тарифы без сюрпризов</h2>
            <p>Полный функционал в обоих тарифах. Первый месяц бесплатный для всех новых пользователей.</p>
          </header>

          <div class="card-grid card-grid--auto landing__pricing">
            <UiCard
              v-for="plan in pricing"
              :key="plan.name"
              :variant="plan.accent ? 'outlined' : 'muted'"
              padding="md"
              class="landing__pricing-card"
              :class="{ 'landing__pricing-card--accent': plan.accent }"
            >
              <header class="landing__pricing-header">
                <div class="landing__pricing-title-row">
                  <h3>{{ plan.name }}</h3>
                  <span
                    v-if="'badge' in plan && plan.badge"
                    class="landing__pricing-badge"
                  >{{ plan.badge }}</span>
                </div>
              </header>

              <div class="landing__pricing-price">
                <span
                  v-if="'oldPrice' in plan && plan.oldPrice"
                  class="landing__pricing-old-price"
                >{{ plan.oldPrice }}</span>
                <strong>{{ plan.price }}</strong>
                <span class="landing__pricing-period">{{ plan.period }}</span>
              </div>

              <div class="landing__pricing-copy">
                <p class="landing__pricing-note">
                  {{ plan.note }}
                </p>
                <p class="landing__pricing-description">
                  {{ plan.description }}
                </p>
              </div>
            </UiCard>
          </div>

          <div class="landing__pricing-action">
            <p class="landing__pricing-highlight">
              Сначала пользуетесь бесплатно, потом выбираете удобный тариф.
            </p>
            <UiButton
              label="Попробовать бесплатно"
              size="lg"
              variant="cta"
              class="landing__pricing-cta-button"
              @click="openRegister()"
            />
          </div>
        </div>
      </section>
    </main>

    <footer class="landing__footer">
      <div class="landing__container landing__footer-inner">
        <div class="landing__footer-brand">
          <router-link
            to="/"
            class="landing__brand"
          >
            <i
              class="pi pi-chart-bar"
              aria-hidden="true"
            />
            <span>FinTree</span>
          </router-link>
          <p>Финансовый помощник для тех, кто хочет тратить осознанно.</p>
        </div>
        <nav class="landing__footer-links">
          <div>
            <h4>Продукт</h4>
            <button
              type="button"
              @click="scrollToSection('screens')"
            >
              Экраны
            </button>
            <button
              type="button"
              @click="scrollToSection('features')"
            >
              Возможности
            </button>
            <button
              type="button"
              @click="scrollToSection('pricing')"
            >
              Тарифы
            </button>
          </div>
        </nav>
      </div>
      <div class="landing__footer-meta">
        <span>&copy; {{ currentYear }} FinTree. Все права защищены.</span>
        <div class="landing__footer-meta-links">
          <router-link to="/privacy">
            Политика конфиденциальности
          </router-link>
          <router-link to="/terms">
            Условия использования
          </router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped src="../styles/pages/landing-page.css"></style>
