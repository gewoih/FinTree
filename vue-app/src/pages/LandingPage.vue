<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    icon: 'pi-telegram',
    title: 'Учёт расходов в Telegram',
    description: 'Записывайте траты одной строкой через @financetree_bot. В среднем это занимает меньше 10 секунд.'
  },
  {
    icon: 'pi-chart-line',
    title: 'Честная аналитика бюджета',
    description: 'Доля сбережений, чистый поток, пики трат и необязательные расходы — все по делу.'
  },
  {
    icon: 'pi-wallet',
    title: 'Контроль ликвидного капитала',
    description: 'Счета, наличные и инвестиции в одном месте без лишних деталей.'
  },
  {
    icon: 'pi-shield',
    title: 'Безопасность без компромиссов',
    description: 'Мы не подключаемся к банкам и не продаем данные. Все вводится только вами.'
  }
] as const

const steps = [
  {
    number: '01',
    title: 'Привяжите Telegram',
    description: 'Отправьте `/id` боту @financetree_bot и вставьте цифры в профиле FinTree.'
  },
  {
    number: '02',
    title: 'Добавляйте операции',
    description: 'Пишите траты в бота @financetree_bot сразу или переносите пачкой из заметок.'
  },
  {
    number: '03',
    title: 'Анализируйте раз в неделю',
    description: 'Веб-кабинет покажет, где теряются деньги и сколько вы реально откладываете.'
  }
] as const

const pricing = [
  {
    name: 'Подписка на месяц',
    price: '390 ₽',
    subprice: 'Новые пользователи получают 1 месяц бесплатно',
    accent: false,
    description: 'Полный доступ к FinTree на 30 дней.',
    features: [
      'Telegram-бот для учёта расходов',
      'Полная аналитика бюджета и капитала',
      'Счета, категории и инвестиции'
    ],
    ctaLabel: 'Попробовать'
  },
  {
    name: 'Подписка на год',
    price: '3 900 ₽',
    subprice: 'Эквивалент 10 месяцев',
    accent: true,
    description: 'Полный доступ к FinTree на 12 месяцев.',
    features: [
      'Telegram-бот для учёта расходов',
      'Полная аналитика бюджета и капитала',
      'Счета, категории и инвестиции'
    ],
    ctaLabel: 'Начать сейчас'
  }
] as const

const faq = [
  {
    question: 'Почему ввод вручную — это нормально?',
    answer: 'Так вы сохраняете точность и контролируете привычки. Telegram-бот делает ввод быстрым.'
  },
  {
    question: 'Как привязать Telegram?',
    answer: 'Отправьте боту @financetree_bot команду `/id`, скопируйте цифры и вставьте их в профиле FinTree.'
  },
  {
    question: 'Что с безопасностью данных?',
    answer: 'Мы не подключаемся к банкам. Доступ к данным есть только у вас.'
  },
  {
    question: 'Что будет после бесплатного месяца?',
    answer: 'Вы сможете продолжить пользоваться сервисом по подписке или оформить год со скидкой.'
  }
] as const

const expandedIndex = ref<number | null>(0)

const currentYear = new Date().getFullYear()

const toggleFaq = (index: number) => {
  expandedIndex.value = expandedIndex.value === index ? null : index
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

        <nav class="landing__links">
          <button
            type="button"
            @click="scrollToSection('features')"
          >
            Возможности
          </button>
          <button
            type="button"
            @click="scrollToSection('steps')"
          >
            Как это работает
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
        </nav>

        <div class="landing__actions">
          <ThemeToggle />
          <AppButton
            variant="ghost"
            label="Войти"
            @click="router.push('/login')"
          />
          <AppButton
            label="Регистрация"
            @click="router.push('/register')"
          />
        </div>
      </div>
    </header>

    <main class="landing__main">
      <section class="landing__hero">
        <div class="landing__container landing__hero-layout">
          <div class="landing__hero-copy">
            <span class="landing__hero-badge">
              <i
                class="pi pi-bolt"
                aria-hidden="true"
              />
              <span>Telegram для учёта · Веб для аналитики</span>
            </span>
            <h1 class="landing__hero-title">
              Финансы под контролем<br>
              без сложных таблиц
            </h1>
            <p class="landing__hero-subtitle">
              Вносите траты в Telegram за 10 секунд и получайте понятную аналитику на сайте раз в неделю.
            </p>

            <div class="landing__hero-actions">
              <AppButton
                label="Начать бесплатный месяц"
                icon="pi pi-arrow-right"
                icon-pos="right"
                size="lg"
                @click="router.push('/register')"
              />
              <AppButton
                label="Посмотреть аналитику"
                variant="ghost"
                size="lg"
                icon="pi pi-play"
                @click="scrollToSection('features')"
              />
            </div>

            <div class="landing__trust">
              <div class="landing__trust-item">
                <i class="pi pi-shield" />
                <span>Без подключения банков</span>
              </div>
              <div class="landing__trust-item">
                <i class="pi pi-check-circle" />
                <span>Данные не покидают FinTree</span>
              </div>
              <div class="landing__trust-item">
                <i class="pi pi-sparkles" />
                <span>Аналитика по делу, без шума</span>
              </div>
            </div>
          </div>

          <AppCard
            class="landing__hero-card"
            padding="lg"
            variant="muted"
            elevated
          >
            <template #header>
              <div class="landing__hero-card-header">
                <span>Превью аналитики</span>
                <i class="pi pi-chart-line" />
              </div>
            </template>
            <div class="landing__hero-card-body">
              <div class="landing__hero-metric">
                <span class="landing__hero-metric-label">Доля сбережений</span>
                <strong>24%</strong>
                <small>+6% за месяц</small>
              </div>
              <div class="landing__hero-metric landing__hero-metric--split">
                <article>
                  <span class="landing__hero-metric-label">Ликвидные месяцы</span>
                  <strong>5.1 мес</strong>
                  <small>цель: 6 месяцев</small>
                </article>
                <article>
                  <span class="landing__hero-metric-label">Чистый поток</span>
                  <strong>+32 400 ₽</strong>
                  <small>текущий месяц</small>
                </article>
              </div>
              <div class="landing__hero-chart">
                <div
                  class="landing__hero-chart-bar"
                  style="--progress: 68%"
                />
              </div>
            </div>
          </AppCard>
        </div>
      </section>

      <section
        id="features"
        class="landing__section"
      >
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>Почему FinTree работает</h2>
            <p>Минимум действий каждый день — максимум ясности на отчётах.</p>
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

      <section
        id="steps"
        class="landing__section landing__section--alt"
      >
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>Понятный процесс без лишних шагов</h2>
            <p>Телеграм закрывает ввод, веб — аналитику и выводы.</p>
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

      <section
        id="pricing"
        class="landing__section"
      >
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>Прозрачная подписка</h2>
            <p>Два тарифа, полный доступ без ограничений и бесплатный месяц для новых пользователей.</p>
          </header>

          <div class="card-grid landing__pricing">
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
                <div>
                  <h3>{{ plan.name }}</h3>
                  <p>{{ plan.description }}</p>
                </div>
                <div class="landing__pricing-price">
                  <strong>{{ plan.price }}</strong>
                  <span v-if="plan.subprice">{{ plan.subprice }}</span>
                </div>
              </header>

              <ul class="landing__pricing-features">
                <li
                  v-for="feature in plan.features"
                  :key="feature"
                >
                  <i
                    class="pi pi-check"
                    aria-hidden="true"
                  />
                  <span>{{ feature }}</span>
                </li>
              </ul>

              <AppButton
                :label="plan.ctaLabel"
                block
                :variant="plan.accent ? 'primary' : 'ghost'"
                @click="router.push('/register')"
              />
            </AppCard>
          </div>
        </div>
      </section>

      <section
        id="faq"
        class="landing__section landing__section--alt"
      >
        <div class="landing__container landing__faq">
          <header class="landing__section-header">
            <h2>Частые вопросы</h2>
            <p>Если не нашли ответ — напишите нам, отвечаем в течение дня.</p>
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
                @click="toggleFaq(index)"
              >
                <span>{{ item.question }}</span>
                <i :class="['pi', expandedIndex === index ? 'pi-chevron-up' : 'pi-chevron-down']" />
              </button>
              <transition name="faq">
                <p
                  v-show="expandedIndex === index"
                  class="landing__faq-answer"
                >
                  {{ item.answer }}
                </p>
              </transition>
            </AppCard>
          </div>
        </div>
      </section>

      <section class="landing__cta">
        <div class="landing__container landing__cta-inner">
          <div>
            <h2>Готовы увидеть реальную картину бюджета?</h2>
            <p>Начните бесплатный месяц и получите первые выводы уже через неделю.</p>
          </div>
          <AppButton
            label="Создать аккаунт"
            icon="pi pi-arrow-right"
            icon-pos="right"
            size="lg"
            @click="router.push('/register')"
          />
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
          <div>
            <h4>Компания</h4>
            <a href="mailto:hello@fintree.app">Написать нам</a>
            <router-link to="/blog">
              Блог
            </router-link>
            <router-link to="/careers">
              Карьера
            </router-link>
          </div>
        </nav>
      </div>
      <div class="landing__footer-meta">
        <span>© {{ currentYear }} FinTree. Все права защищены.</span>
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(
      900px 600px at 8% -15%,
      color-mix(in srgb, var(--ft-primary-500) 28%, transparent),
      transparent
    ),
    radial-gradient(
      700px 520px at 92% 8%,
      color-mix(in srgb, var(--ft-info-500) 14%, transparent),
      transparent
    ),
    linear-gradient(180deg, var(--ft-bg-base) 0%, var(--ft-bg-muted) 100%);
  color: var(--ft-text-primary);
}

.landing__container {
  width: 100%;
  max-width: var(--ft-container-2xl);
  margin: 0 auto;
  padding: clamp(var(--ft-space-6), 5vw, var(--ft-space-10)) clamp(var(--ft-space-4), 5vw, var(--ft-space-8));
}

.landing__nav {
  position: sticky;
  top: 0;
  z-index: var(--ft-z-sticky);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--ft-border-subtle);
  background: color-mix(in srgb, var(--ft-bg-base) 85%, transparent);
}

.landing__nav-inner {
  width: 100%;
  max-width: var(--ft-container-2xl);
  margin: 0 auto;
  padding: clamp(var(--ft-space-3), 4vw, var(--ft-space-5)) clamp(var(--ft-space-4), 5vw, var(--ft-space-8));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-5);
}

.landing__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  font-weight: var(--ft-font-bold);
  font-size: var(--ft-text-lg);
  font-family: var(--ft-font-display);
  letter-spacing: -0.01em;
  color: var(--ft-text-primary);
}

.landing__brand i {
  color: var(--ft-primary-600);
  font-size: 1.25rem;
}

.landing__links {
  display: flex;
  gap: var(--ft-space-4);
  align-items: center;
}

.landing__links button {
  background: transparent;
  border: none;
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-medium);
  transition: color var(--ft-transition-fast);
  cursor: pointer;
}

.landing__links button:hover {
  color: var(--ft-text-primary);
}

.landing__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--ft-space-3);
}

.landing__hero {
  position: relative;
  overflow: hidden;
}

.landing__hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
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
  opacity: 0.8;
  pointer-events: none;
}

.landing__hero-layout {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: clamp(var(--ft-space-6), 5vw, var(--ft-space-10));
  align-items: center;
  z-index: 1;
}

.landing__hero-copy {
  display: flex;
  flex-direction: column;
  gap: clamp(var(--ft-space-4), 3vw, var(--ft-space-6));
  animation: fadeUp 720ms var(--ft-ease-in-out) both;
}

.landing__hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  border-radius: var(--ft-radius-full);
  padding: var(--ft-space-1) var(--ft-space-3);
  background: color-mix(in srgb, var(--ft-primary-500) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--ft-primary-500) 40%, transparent);
  color: var(--ft-primary-200);
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: var(--ft-font-semibold);
}

.landing__hero-title {
  margin: 0;
  font-size: clamp(2.6rem, 4vw, 3.6rem);
  line-height: 1.1;
  font-family: var(--ft-font-display);
  letter-spacing: var(--ft-letter-spacing-display);
}

.landing__hero-subtitle {
  margin: 0;
  color: var(--ft-text-secondary);
  font-size: clamp(var(--ft-text-base), 2.2vw, 1.1rem);
  max-width: 46ch;
}

.landing__hero-actions {
  display: flex;
  gap: var(--ft-space-3);
  flex-wrap: wrap;
}

.landing__trust {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--ft-space-3);
}

.landing__trust-item {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  padding: var(--ft-space-3);
  border-radius: var(--ft-radius-lg);
  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  color: var(--ft-text-secondary);
}

.landing__hero-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ft-border-subtle);
  background: var(--ft-surface-base);
  animation: fadeUp 720ms var(--ft-ease-in-out) both;
  animation-delay: 120ms;
  box-shadow: var(--ft-shadow-2xl);
}

.landing__hero-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 24%, transparent),
    color-mix(in srgb, var(--ft-info-500) 12%, transparent)
  );
  opacity: 0.5;
  pointer-events: none;
}

.landing__hero-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--ft-text-secondary);
}

.landing__hero-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  position: relative;
  z-index: 1;
}

.landing__hero-metric {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
}

.landing__hero-metric strong {
  font-size: var(--ft-text-2xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
}

.landing__hero-metric small {
  color: var(--ft-success-400);
}

.landing__hero-metric--split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ft-space-4);
}

.landing__hero-chart {
  position: relative;
  height: 6px;
  border-radius: var(--ft-radius-full);
  background: color-mix(in srgb, var(--ft-border-default) 65%, transparent);
  overflow: hidden;
}

.landing__hero-chart-bar {
  position: absolute;
  inset: 0;
  width: var(--progress);
  background: linear-gradient(90deg, var(--ft-primary-400), var(--ft-success-400));
}

.landing__section {
  position: relative;
  scroll-margin-top: 110px;
}

.landing__section--alt {
  background: var(--ft-bg-subtle);
  border-top: 1px solid var(--ft-border-subtle);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.landing__section-header {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  text-align: center;
  margin-bottom: clamp(var(--ft-space-6), 4vw, var(--ft-space-8));
}

.landing__section-header h2 {
  margin: 0;
  font-size: clamp(1.85rem, 3vw, 2.6rem);
  font-family: var(--ft-font-display);
}

.landing__section-header p {
  margin: 0;
  color: var(--ft-text-secondary);
}

.landing__feature-card {
  gap: var(--ft-space-3);
  border: 1px solid var(--ft-border-subtle);
  background: var(--ft-surface-base);
  transition: transform var(--ft-transition-fast), border-color var(--ft-transition-fast), box-shadow var(--ft-transition-fast);
  animation: fadeUp 680ms var(--ft-ease-in-out) both;
}

.landing__feature-card:nth-child(1) {
  animation-delay: 60ms;
}

.landing__feature-card:nth-child(2) {
  animation-delay: 120ms;
}

.landing__feature-card:nth-child(3) {
  animation-delay: 180ms;
}

.landing__feature-card:nth-child(4) {
  animation-delay: 240ms;
}

.landing__feature-card:hover {
  transform: translateY(-4px);
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
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: var(--ft-radius-lg);
  background: color-mix(in srgb, var(--ft-primary-500) 20%, transparent);
  color: var(--ft-primary-500);
  font-size: 1.5rem;
}

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
  transform: translateY(-4px);
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
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ft-primary-300);
}

.landing__pricing {
  gap: var(--ft-space-4);
  align-items: stretch;
}

.landing__pricing-card {
  gap: var(--ft-space-4);
  border: 1px solid var(--ft-border-subtle);
  background: var(--ft-surface-base);
}

.landing__pricing-card--accent {
  border-width: 2px;
  border-color: color-mix(in srgb, var(--ft-primary-500) 70%, transparent);
  box-shadow: var(--ft-shadow-xl);
}

.landing__pricing-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--ft-space-4);
}

.landing__pricing-header h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
}

.landing__pricing-header p {
  margin: var(--ft-space-1) 0 0;
  color: var(--ft-text-secondary);
}

.landing__pricing-header strong {
  font-size: var(--ft-text-2xl);
  color: var(--ft-text-primary);
}

.landing__pricing-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--ft-space-1);
  text-align: right;
}

.landing__pricing-price span {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.landing__pricing-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
  margin: 0;
  padding: 0;
  color: var(--ft-text-secondary);
}

.landing__pricing-features li {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.landing__pricing-features i {
  color: var(--ft-success-400);
}

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
  border: 1px solid var(--ft-border-subtle);
  background: var(--ft-surface-base);
}

.landing__faq-question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-2);
  width: 100%;
  background: none;
  border: none;
  color: inherit;
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  text-align: left;
  cursor: pointer;
}

.landing__faq-answer {
  margin: 0;
  color: var(--ft-text-secondary);
  line-height: 1.6;
}

.faq-enter-active,
.faq-leave-active {
  transition: opacity var(--ft-transition-base), transform var(--ft-transition-base);
}

.faq-enter-from,
.faq-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.landing__cta {
  padding-block: clamp(var(--ft-space-8), 6vw, var(--ft-space-12));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 26%, transparent),
    color-mix(in srgb, var(--ft-primary-500) 8%, transparent)
  );
  border-top: 1px solid var(--ft-border-subtle);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.landing__cta-inner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--ft-space-6);
  align-items: center;
}

.landing__cta-inner h2 {
  margin: 0;
  font-size: clamp(1.85rem, 3vw, 2.4rem);
  font-family: var(--ft-font-display);
}

.landing__cta-inner p {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
}

.landing__footer {
  margin-top: auto;
  border-top: 1px solid var(--ft-border-subtle);
  background: var(--ft-bg-base);
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

.landing__footer-links h4 {
  margin: 0 0 var(--ft-space-2);
  font-size: var(--ft-text-sm);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ft-text-tertiary);
}

.landing__footer-links button,
.landing__footer-links a {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-1);
  background: none;
  border: none;
  padding: 0;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-sm);
  cursor: pointer;
  text-decoration: none;
  transition: color var(--ft-transition-fast);
}

.landing__footer-links button:hover,
.landing__footer-links a:hover {
  color: var(--ft-text-primary);
}

.landing__footer-meta {
  padding: var(--ft-space-4) clamp(var(--ft-space-4), 5vw, var(--ft-space-8));
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--ft-space-3);
  font-size: var(--ft-text-sm);
  color: var(--ft-text-tertiary);
  border-top: 1px solid color-mix(in srgb, var(--ft-border-default) 50%, transparent);
}

.light-mode .landing__hero-badge {
  color: var(--ft-primary-700);
}

.landing__footer-meta-links {
  display: flex;
  gap: var(--ft-space-3);
  flex-wrap: wrap;
}

.landing__footer-meta-links a {
  color: inherit;
  text-decoration: none;
}

.landing__footer-meta-links a:hover {
  color: var(--ft-text-primary);
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 960px) {
  .landing__links {
    display: none;
  }

  .landing__hero-metric--split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .landing__nav-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .landing__actions {
    justify-content: flex-start;
  }

  .landing__hero-actions {
    flex-direction: column;
  }
}
</style>
