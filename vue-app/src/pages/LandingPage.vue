<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAnalytics } from '@/composables/useAnalytics'
import type { AnalyticsEvent } from '@/composables/useAnalytics'
import analyticsImage from '@/assets/landing/analytics.png'
import accountsImage from '@/assets/landing/accounts.png'
import investmentsImage from '@/assets/landing/investments.png'
import forecastImage from '@/assets/landing/forecast.png'

const router = useRouter()
const { trackEvent } = useAnalytics()

const features = [
  {
    icon: 'pi-telegram',
    title: 'Запись расхода за пару секунд',
    description: 'Простая и удобная запись расходов через Telegram поможет Вам поддерживать привычку ведения бюджета.'
  },
  {
    icon: 'pi-chart-line',
    title: 'Простая и эффективная аналитика',
    description: 'Уже в первый месяц FinTree покажет где Вы теряете деньги и как безболезненно сократить расходы.'
  },
  {
    icon: 'pi-wallet',
    title: 'Полная картина по вашим финансам',
    description: 'Учет всех банковских счетов и инвестиций в одном месте - Вы всегда знаете точный размер своего капитала.'
  },
  {
    icon: 'pi-shield',
    title: 'Данные под вашим контролем',
    description: 'Мы позаботились о защите Ваших данных, поэтому FinTree не подключается к Вашему банковскому приложению.'
  }
] as const

const steps = [
  {
    number: '01',
    title: 'Создайте аккаунт за пару кликов',
    description: 'Без персональных данных, без банковских карт.'
  },
  {
    number: '02',
    title: 'Записывайте Ваши траты',
    description: 'С нашим Telegram-ботом это особенно быстро и легко!'
  },
  {
    number: '03',
    title: 'FinTree укажет на слабые места',
    description: 'Уже через несколько дней Вы увидите детальную аналитику по Вашим финансам.'
  }
] as const

const problems = [
  {
    icon: 'pi-file-excel',
    text: 'Excel таблицы кажутся слишком сложными и неинформативными?',
    color: 'var(--ft-warning-500)',
    bg: 'color-mix(in srgb, var(--ft-warning-500) 18%, transparent)'
  },
  {
    icon: 'pi-credit-card',
    text: 'Банковская аналитика показывает несуществующие траты?',
    color: 'var(--ft-danger-400)',
    bg: 'color-mix(in srgb, var(--ft-danger-400) 18%, transparent)'
  },
  {
    icon: 'pi-question-circle',
    text: 'В конце месяца не понимаете куда снова делись все деньги?',
    color: 'var(--ft-info-400)',
    bg: 'color-mix(in srgb, var(--ft-info-400) 18%, transparent)'
  }
] as const

const pricing = [
  {
    name: 'Месяц',
    price: '390 ₽',
    period: 'в месяц',
    note: 'Гибкая помесячная оплата',
    description: 'Оптимально, если хотите начать без долгого обязательства.',
    accent: false
  },
  {
    name: 'Год',
    oldPrice: '4 680 ₽',
    price: '3 900 ₽',
    period: 'в год',
    note: '325 ₽ в месяц при оплате за год',
    description: 'Экономия 780 ₽ в год по сравнению с помесячной оплатой.',
    accent: true,
    badge: 'Лучший выбор',
    discount: '-17%'
  }
] as const

const faq = [
  {
    question: 'Что входит в бесплатный месяц?',
    answer: 'Весь функционал FinTree доступен без ограничений. Вы спокойно пробуете сервис и решаете позже, нужен ли платный тариф.'
  },
  {
    question: 'Как происходит оплата после пробного периода?',
    answer: 'По окончании пробного месяца вы сами выбираете: продолжать на месячном или годовом тарифе, либо не продлевать. Никаких скрытых списаний.'
  },
  {
    question: 'Как отменить подписку?',
    answer: 'Подписка отключается в настройках аккаунта. Процедура занимает меньше минуты и не требует обращения в поддержку.'
  },
  {
    question: 'Что будет с данными, если удалить аккаунт?',
    answer: 'После удаления аккаунта данные перестают быть доступны в сервисе. Детали хранения и удаления описаны в политике конфиденциальности.'
  },
  {
    question: 'Зачем вводить траты вручную, если есть банковские приложения?',
    answer: 'Короткая запись в Telegram обычно быстрее ручной разборки банковских категорий. А главное, вы видите расходы сразу и лучше держите бюджет под контролем.'
  },
  {
    question: 'Сколько времени занимает старт?',
    answer: 'Обычно до 2 минут на привязку Telegram и первую запись. Уже через несколько дней появляется понятная картина по тратам.'
  },
  {
    question: 'Насколько безопасны мои финансовые данные?',
    answer: 'FinTree не подключается к банковским счетам напрямую. Вы сами добавляете данные и управляете ими в своем аккаунте.'
  }
] as const

const dashboardScreens = [
  {
    title: 'Страница счетов',
    description: 'Полный учет Ваших банковских счетов из всех банков на одной странице.',
    image: accountsImage,
    alt: 'Скриншот страницы счетов в FinTree'
  },
  {
    title: 'Учет инвестиций',
    description: 'Цельная картина Ваших инвестиций для долгосрочного планирования.',
    image: investmentsImage,
    alt: 'Скриншот страницы инвестиций в FinTree'
  },
  {
    title: 'Умный прогноз расходов',
    description: 'Предскажет сколько денег потребуется до конца месяца.',
    image: forecastImage,
    alt: 'Скриншот графика прогноза расходов в FinTree'
  }
] as const

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
          <i class="pi pi-chart-bar" />
          <span>FinTree</span>
        </router-link>

        <div class="landing__actions">
          <ThemeToggle />
          <AppButton
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
              <AppButton
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
                <i class="pi pi-lock" />
                <span>Данные под защитой</span>
              </div>
              <div class="landing__trust-item">
                <i class="pi pi-times-circle" />
                <span>Без банковской карты</span>
              </div>
              <div class="landing__trust-item">
                <i class="pi pi-check-circle" />
                <span>Простая запись расходов</span>
              </div>
            </div>
          </div>

          <AppCard
            class="landing__hero-shot"
            padding="lg"
            variant="muted"
            elevated
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
          </AppCard>
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
            <AppCard
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
            </AppCard>
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
            <AppCard
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
                <i :class="['pi', problem.icon]" />
              </div>
              <p>{{ problem.text }}</p>
            </AppCard>
          </div>

          <div class="landing__solution-bridge">
            <i class="pi pi-arrow-down" />
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
            <AppCard
              v-for="feature in features"
              :key="feature.title"
              variant="muted"
              padding="lg"
              class="landing__feature-card"
            >
              <div class="landing__feature-icon">
                <i :class="['pi', feature.icon]" />
              </div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </AppCard>
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
            <AppCard
              v-for="step in steps"
              :key="step.number"
              variant="outlined"
              padding="lg"
              class="landing__step-card"
            >
              <span class="landing__step-number">{{ step.number }}</span>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </AppCard>
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
            <AppCard
              v-for="plan in pricing"
              :key="plan.name"
              :variant="plan.accent ? 'outlined' : 'muted'"
              padding="lg"
              class="landing__pricing-card"
              :class="{ 'landing__pricing-card--accent': plan.accent }"
              :elevated="plan.accent"
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
            </AppCard>
          </div>

          <div class="landing__pricing-action">
            <p>Первый месяц бесплатный для новых пользователей.</p>
            <AppButton
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
            <AppCard
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
                <i :class="['pi', expandedIndex === index ? 'pi-chevron-up' : 'pi-chevron-down']" />
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
            </AppCard>
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
            <i class="pi pi-chart-bar" />
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

<style scoped>
.landing {
  display: flex;
  flex-direction: column;

  min-height: 100vh;

  color: var(--ft-text-primary);

  background:
    radial-gradient(
      900px 600px at 8% -15%,
      color-mix(in srgb, var(--ft-primary-500) 22%, transparent),
      transparent
    ),
    radial-gradient(
      700px 520px at 92% 8%,
      color-mix(in srgb, var(--ft-info-500) 14%, transparent),
      transparent
    ),
    linear-gradient(180deg, var(--ft-bg-base) 0%, var(--ft-bg-muted) 100%);
}

.landing__container {
  width: 100%;
  max-width: var(--ft-container-2xl);
  margin: 0 auto;
  padding: clamp(var(--ft-space-6), 5vw, var(--ft-space-10)) clamp(var(--ft-space-4), 5vw, var(--ft-space-8));
}

/* ── Nav ── */

.landing__nav {
  position: sticky;
  z-index: var(--ft-z-sticky);
  top: 0;

  background: color-mix(in srgb, var(--ft-bg-base) 85%, transparent);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.landing__nav-inner {
  display: flex;
  gap: var(--ft-space-5);
  align-items: center;
  justify-content: space-between;

  width: 100%;
  max-width: var(--ft-container-2xl);
  margin: 0 auto;
  padding: clamp(var(--ft-space-3), 4vw, var(--ft-space-5)) clamp(var(--ft-space-4), 5vw, var(--ft-space-8));
}

.landing__brand {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;

  font-family: var(--ft-font-display);
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  letter-spacing: -0.01em;
}

.landing__brand i {
  font-size: 1.25rem;
  color: var(--ft-primary-600);
}

.landing__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  align-items: center;
}

/* ── Hero ── */

.landing__hero {
  position: relative;
  overflow: hidden;
}

.landing__hero::after {
  pointer-events: none;
  content: '';

  position: absolute;
  inset: 0;

  opacity: 0.8;
  background:
    radial-gradient(
      900px 600px at 8% -15%,
      color-mix(in srgb, var(--ft-success-500) 28%, transparent),
      color-mix(in srgb, var(--ft-primary-500) 20%, transparent)
    ),
    radial-gradient(
      55% 55% at 75% 10%,
      color-mix(in srgb, var(--ft-primary-500) 20%, transparent),
      transparent
    ),
    radial-gradient(
      45% 45% at 15% 70%,
      color-mix(in srgb, var(--ft-info-500) 12%, transparent),
      transparent
    );
}

.landing__hero-layout {
  position: relative;
  z-index: 1;

  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: clamp(var(--ft-space-6), 5vw, var(--ft-space-10));
  align-items: center;
}

.landing__hero-copy {
  display: flex;
  flex-direction: column;
  gap: clamp(var(--ft-space-4), 3vw, var(--ft-space-6));
  animation: fade-up 720ms var(--ft-ease-in-out) both;
}

.landing__hero-title {
  margin: 0;

  font-family: var(--ft-font-display);
  font-size: clamp(2.2rem, 4vw, 3.6rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.landing__hero-subtitle {
  max-width: 64ch;
  margin: 0;
  font-size: clamp(var(--ft-text-base), 2.2vw, 1.1rem);
  color: var(--ft-text-secondary);
}

.landing__hero-cta {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.landing__hero-disclaimer {
  margin: 0;
  font-size: var(--ft-text-xs);
  color: var(--ft-text-tertiary);
  text-align: center;
}

.landing__trust {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--ft-space-3);
}

.landing__trust-item {
  display: flex;
  gap: var(--ft-space-2);
  align-items: center;

  padding: var(--ft-space-3);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
}

.landing__hero-shot {
  position: relative;

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  box-shadow: var(--ft-shadow-2xl);

  animation: fade-up 720ms var(--ft-ease-in-out) both;
  animation-delay: 120ms;
}

.landing__hero-shot-title {
  margin: 0 0 var(--ft-space-3);
  font-size: var(--ft-text-lg);
  color: var(--ft-text-secondary);
}

.landing__hero-shot-frame {
  overflow: hidden;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
}

.landing__hero-shot-image {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.landing__hero-shot-caption {
  margin: var(--ft-space-3) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
}

/* ── Social Proof Bar ── */

.landing__social-proof {
  background: var(--ft-bg-subtle);
  border-top: 1px solid var(--ft-border-subtle);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.landing__social-proof-inner {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(var(--ft-space-6), 5vw, var(--ft-space-10));
  align-items: center;
  justify-content: center;

  padding-block: var(--ft-space-5);
}

.landing__social-proof-item {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
  align-items: center;

  text-align: center;
}

.landing__social-proof-item strong {
  font-size: var(--ft-text-2xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-primary-500);
}

.landing__social-proof-item span {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.landing__social-proof-divider {
  width: 1px;
  height: 40px;
  background: var(--ft-border-default);
}

/* ── Problem → Solution ── */

.landing__problems {
  gap: var(--ft-space-4);
}

.landing__problem-card {
  gap: var(--ft-space-3);
  text-align: center;
  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
}

.landing__problem-card p {
  margin: 0;
  font-size: var(--ft-text-base);
  color: var(--ft-text-secondary);
}

.landing__problem-icon {
  display: grid;
  place-items: center;

  width: 48px;
  height: 48px;
  margin: 0 auto;

  font-size: 1.5rem;

  border-radius: var(--ft-radius-lg);
}

.landing__solution-bridge {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
  align-items: center;

  margin-top: clamp(var(--ft-space-6), 4vw, var(--ft-space-8));

  text-align: center;
}

.landing__solution-bridge i {
  font-size: 1.5rem;
  color: var(--ft-primary-500);
}

.landing__solution-bridge p {
  max-width: 56ch;
  margin: 0;

  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

/* ── Sections (shared) ── */

.landing__section {
  scroll-margin-top: 110px;
  position: relative;
}

.landing__section--alt {
  background: var(--ft-bg-subtle);
  border-top: 1px solid var(--ft-border-subtle);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.landing__section--showcase .landing__container {
  max-width: min(1880px, 100%);
  padding-right: clamp(var(--ft-space-2), 1.4vw, var(--ft-space-5));
  padding-left: clamp(var(--ft-space-2), 1.4vw, var(--ft-space-5));
}

.landing__section-header {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);

  margin-bottom: clamp(var(--ft-space-6), 4vw, var(--ft-space-8));

  text-align: center;
}

.landing__section-header h2 {
  margin: 0;
  font-family: var(--ft-font-display);
  font-size: clamp(1.85rem, 3vw, 2.6rem);
}

.landing__section-header p {
  margin: 0;
  color: var(--ft-text-secondary);
}

/* ── Features ── */

.landing__feature-card {
  gap: var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);

  transition: transform var(--ft-transition-fast), border-color var(--ft-transition-fast), box-shadow var(--ft-transition-fast);
  animation: fade-up 680ms var(--ft-ease-in-out) both;
}

.landing__feature-card:nth-child(1) { animation-delay: 60ms; }
.landing__feature-card:nth-child(2) { animation-delay: 120ms; }
.landing__feature-card:nth-child(3) { animation-delay: 180ms; }
.landing__feature-card:nth-child(4) { animation-delay: 240ms; }

.landing__feature-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--ft-primary-500) 45%, var(--ft-border-subtle));
  box-shadow: var(--ft-shadow-lg);
}

.landing__feature-card h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
  color: var(--ft-text-primary);
}

.landing__feature-card p {
  margin: 0;
  color: var(--ft-text-secondary);
}

.landing__feature-icon {
  display: grid;
  place-items: center;

  width: 48px;
  height: 48px;

  font-size: 1.5rem;
  color: var(--ft-primary-500);

  background: color-mix(in srgb, var(--ft-primary-500) 20%, transparent);
  border-radius: var(--ft-radius-lg);
}

/* ── Steps ── */

.landing__steps {
  gap: var(--ft-space-4);
}

.landing__step-card {
  gap: var(--ft-space-3);
  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  transition: transform var(--ft-transition-fast), border-color var(--ft-transition-fast), box-shadow var(--ft-transition-fast);
}

.landing__step-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--ft-primary-500) 40%, var(--ft-border-subtle));
  box-shadow: var(--ft-shadow-lg);
}

.landing__step-card h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
}

.landing__step-card p {
  margin: 0;
  color: var(--ft-text-secondary);
}

.landing__step-number {
  font-size: var(--ft-text-sm);
  color: var(--ft-primary-300);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

/* ── Screenshots ── */

.landing__screens {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ft-space-2);
  align-items: stretch;
}

.landing__screen-card {
  gap: var(--ft-space-3);
  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
}

.landing__screen-media {
  overflow: hidden;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
}

.landing__screen-media img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.landing__screen-card h3 {
  margin: 0;
  font-size: var(--ft-text-lg);
}

.landing__screen-card p {
  margin: 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

/* ── Pricing ── */

.landing__pricing {
  grid-template-columns: repeat(2, minmax(280px, 430px));
  gap: var(--ft-space-3);
  justify-content: center;

  max-width: 930px;
  margin: 0 auto;
}

.landing__pricing-card {
  gap: var(--ft-space-4);
  align-items: center;
  justify-content: space-between;

  text-align: center;

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-2xl);
}

.landing__pricing-card--accent {
  border-color: color-mix(in srgb, var(--ft-primary-500) 70%, transparent);
  border-width: 2px;
  box-shadow: var(--ft-shadow-xl);
}

.landing__pricing-header {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: center;

  width: 100%;

  text-align: center;
}

.landing__pricing-title-row {
  display: inline-flex;
  gap: var(--ft-space-2);
  align-items: center;
}

.landing__pricing-header h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
}

.landing__pricing-badge {
  display: inline-block;

  padding: var(--ft-space-1) var(--ft-space-2);

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-success-400);
  letter-spacing: 0.04em;

  background: color-mix(in srgb, var(--ft-success-500) 20%, transparent);
  border-radius: var(--ft-radius-full);
}

.landing__pricing-discount {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: var(--ft-space-1) var(--ft-space-2);

  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-success-300);

  background: color-mix(in srgb, var(--ft-success-500) 24%, transparent);
  border: 1px solid color-mix(in srgb, var(--ft-success-500) 40%, transparent);
  border-radius: var(--ft-radius-full);
}

.landing__pricing-price {
  display: flex;
  flex-direction: column;
  gap: calc(var(--ft-space-1) / 2);
  align-items: center;

  text-align: center;
}

.landing__pricing-old-price {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
  text-decoration: line-through;
}

.landing__pricing-price strong {
  font-size: clamp(2rem, 3vw, 2.4rem);
  font-weight: var(--ft-font-bold);
  line-height: 1.1;
}

.landing__pricing-period {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.landing__pricing-copy {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  align-items: center;
}

.landing__pricing-note,
.landing__pricing-description {
  max-width: 32ch;
  margin: 0;
}

.landing__pricing-note {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.landing__pricing-description {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.landing__pricing-action {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
  align-items: center;
  justify-content: center;

  margin-top: clamp(var(--ft-space-5), 4vw, var(--ft-space-8));

  text-align: center;
}

.landing__pricing-action p {
  margin: 0;
  color: var(--ft-text-secondary);
}

/* ── FAQ ── */

.landing__faq {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
}

.landing__faq-list {
  display: grid;
  gap: var(--ft-space-3);
}

.landing__faq-item {
  gap: var(--ft-space-2);
  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
}

.landing__faq-question {
  cursor: pointer;

  display: flex;
  gap: var(--ft-space-2);
  align-items: center;
  justify-content: space-between;

  width: 100%;

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: inherit;
  text-align: left;

  background: none;
  border: none;
}

.landing__faq-answer {
  margin: 0;
  line-height: 1.6;
  color: var(--ft-text-secondary);
}

.faq-enter-active,
.faq-leave-active {
  transition: opacity var(--ft-transition-base), transform var(--ft-transition-base);
}

.faq-enter-from,
.faq-leave-to {
  transform: translateY(-4px);
  opacity: 0;
}

/* ── Footer ── */

.landing__footer {
  margin-top: auto;
  background: var(--ft-bg-base);
  border-top: 1px solid var(--ft-border-subtle);
}

.landing__footer-inner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--ft-space-6);
  align-items: start;
}

.landing__footer-brand p {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
}

.landing__footer-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--ft-space-4);
}

.landing__footer-links > div {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.landing__footer-links h4 {
  margin: 0 0 var(--ft-space-1);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.landing__footer-links button,
.landing__footer-links a {
  cursor: pointer;

  display: inline-flex;
  gap: var(--ft-space-1);
  align-items: center;

  padding: 0;

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
  text-decoration: none;

  background: none;
  border: none;

  transition: color var(--ft-transition-fast);
}

.landing__footer-links button:hover,
.landing__footer-links a:hover {
  color: var(--ft-text-primary);
}

.landing__footer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
  justify-content: space-between;

  padding: var(--ft-space-4) clamp(var(--ft-space-4), 5vw, var(--ft-space-8));

  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);

  border-top: 1px solid color-mix(in srgb, var(--ft-border-default) 50%, transparent);
}

.landing__footer-meta-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
}

.landing__footer-meta-links a {
  color: inherit;
  text-decoration: none;
}

.landing__footer-meta-links a:hover {
  color: var(--ft-text-primary);
}

/* ── Animations ── */

@keyframes fade-up {
  from {
    transform: translateY(14px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* ── Responsive ── */

@media (width <= 960px) {
  .landing__social-proof-divider {
    display: none;
  }

  .landing__screens {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .landing__pricing {
    grid-template-columns: minmax(280px, 420px);
  }
}

@media (width <= 640px) {
  .landing__nav-inner {
    flex-direction: row;
    align-items: center;
  }

  .landing__trust {
    grid-template-columns: 1fr;
  }

  .landing__screens {
    grid-template-columns: 1fr;
  }
}
</style>
