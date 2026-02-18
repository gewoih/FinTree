<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalytics } from '@/composables/useAnalytics'
import type { AnalyticsEvent } from '@/composables/useAnalytics'
import { dashboardScreens, faq, features, pricing, problems, steps } from '@/composables/useLandingPageContent'
import UiButton from '@/ui/UiButton.vue'
import UiCard from '@/ui/UiCard.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import analyticsImage from '@/assets/landing/analytics.png'

const router = useRouter()
const { trackEvent } = useAnalytics()

const expandedIndex = ref<number | null>(0)

const currentYear = new Date().getFullYear()

const openRegister = (eventName: AnalyticsEvent, payload?: Record<string, string>) => {
  trackEvent(eventName, payload)
  router.push('/register')
}

const toggleFaq = (index: number) => {
  const isOpening = expandedIndex.value !== index
  expandedIndex.value = expandedIndex.value === index ? null : index

  if (isOpening && faq[index]) {
    trackEvent('faq_open', { questionIndex: index, question: faq[index].question })
  }
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
          <UiButton
            label="Создать аккаунт"
            variant="cta"
            @click="openRegister('nav_cta_click')"
          />
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
              Простое лекарство<br>
              от дыр в бюджете
            </h1>
            <p class="landing__hero-subtitle">
              Возможны побочные эффекты в виде экономии <b>от 5.000р. в месяц.</b><br>
              Необходима консультация со специалистом.
            </p>

            <div class="landing__hero-cta">
              <UiButton
                label="Начать бесплатно"
                size="lg"
                variant="cta"
                @click="openRegister('hero_cta_click')"
              />
              <p class="landing__hero-disclaimer">
                Первый месяц полностью бесплатно. Без привязки карты и скрытых условий.
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
                  class="pi pi-times-circle"
                  aria-hidden="true"
                />
                <span>Без банковской карты</span>
              </div>
              <div class="landing__trust-item">
                <i
                  class="pi pi-check-circle"
                  aria-hidden="true"
                />
                <span>Простая запись расходов</span>
              </div>
            </div>
          </div>

          <UiCard
            class="landing__hero-shot"
            padding="lg"
            variant="muted"
          >
            <p class="landing__hero-shot-title">
              Главный экран аналитики
            </p>
            <div class="landing__hero-shot-frame">
              <img
                :src="analyticsImage"
                alt="Скриншот главной страницы аналитики в FinTree"
                class="landing__hero-shot-image"
                loading="eager"
                decoding="async"
              >
            </div>
            <p class="landing__hero-shot-caption">
              Реальный скриншот из личного кабинета.
            </p>
          </UiCard>
        </div>
      </section>

      <!-- Social Proof Bar -->
      <section class="landing__social-proof">
        <div class="landing__container landing__social-proof-inner">
          <div class="landing__social-proof-item">
            <strong>10 секунд</strong>
            <span>на запись расхода</span>
          </div>
          <div class="landing__social-proof-divider" />
          <div class="landing__social-proof-item">
            <strong>5 минут в день</strong>
            <span>на аналитику</span>
          </div>
          <div class="landing__social-proof-divider" />
          <div class="landing__social-proof-item">
            <strong>От -10%</strong>
            <span>сокращение Ваших расходов</span>
          </div>
        </div>
      </section>

      <!-- Product Screens -->
      <section class="landing__section landing__section--showcase">
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>Сильная аналитика в реальном кабинете</h2>
            <p>Не концепт и не мокапы: ниже живые экраны того, что увидит пользователь после регистрации.</p>
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

      <!-- Problem → Solution -->
      <section class="landing__section landing__section--alt">
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>Знакомо?</h2>
          </header>

          <div class="card-grid card-grid--balanced landing__problems">
            <UiCard
              v-for="problem in problems"
              :key="problem.text"
              variant="muted"
              padding="lg"
              class="landing__problem-card"
            >
              <div
                class="landing__problem-icon"
                :style="{ background: problem.bg, color: problem.color }"
              >
                <i
                  :class="['pi', problem.icon]"
                  aria-hidden="true"
                />
              </div>
              <p>{{ problem.text }}</p>
            </UiCard>
          </div>

          <div class="landing__solution-bridge">
            <i
              class="pi pi-arrow-down"
              aria-hidden="true"
            />
            <p><strong>FinTree снимает эту рутину.</strong> 10 секунд на запись в Telegram, а в кабинете уже готовые выводы по расходам.</p>
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

      <!-- How It Works -->
      <section
        id="steps"
        class="landing__section landing__section--alt"
      >
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>Как начать за 3 шага</h2>
            <p>Сделали один раз и дальше просто фиксируете траты по дороге.</p>
          </header>

          <div class="card-grid card-grid--balanced landing__steps">
            <UiCard
              v-for="step in steps"
              :key="step.number"
              variant="outlined"
              padding="lg"
              class="landing__step-card"
            >
              <span class="landing__step-number">{{ step.number }}</span>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
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
            <p>Полный функционал в обоих тарифах. Выберите удобный формат оплаты.</p>
          </header>

          <div class="card-grid card-grid--auto landing__pricing">
            <UiCard
              v-for="plan in pricing"
              :key="plan.name"
              :variant="plan.accent ? 'outlined' : 'muted'"
              padding="lg"
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
                <span
                  v-if="'discount' in plan && plan.discount"
                  class="landing__pricing-discount"
                >{{ plan.discount }}</span>
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
            <p>Первый месяц бесплатный для новых пользователей.</p>
            <UiButton
              label="Начать бесплатный месяц"
              size="lg"
              variant="cta"
              @click="openRegister('pricing_cta_click')"
            />
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section
        id="faq"
        class="landing__section"
      >
        <div class="landing__container landing__faq">
          <header class="landing__section-header">
            <h2>Частые вопросы</h2>
            <p>Коротко о том, что обычно спрашивают перед стартом.</p>
          </header>

          <div class="landing__faq-list">
            <UiCard
              v-for="(item, index) in faq"
              :key="item.question"
              variant="muted"
              padding="md"
              class="landing__faq-item"
            >
              <button
                type="button"
                class="landing__faq-question"
                :aria-expanded="expandedIndex === index"
                :aria-controls="`faq-answer-${index}`"
                @click="toggleFaq(index)"
              >
                <span>{{ item.question }}</span>
                <i
                  :class="['pi', expandedIndex === index ? 'pi-chevron-up' : 'pi-chevron-down']"
                  aria-hidden="true"
                />
              </button>
              <transition name="faq">
                <p
                  v-show="expandedIndex === index"
                  :id="`faq-answer-${index}`"
                  class="landing__faq-answer"
                >
                  {{ item.answer }}
                </p>
              </transition>
            </UiCard>
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
            <button
              type="button"
              @click="scrollToSection('faq')"
            >
              FAQ
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
