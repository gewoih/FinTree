<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    icon: 'pi-wallet',
    title: 'Мультивалютные счета',
    description: 'Подключайте любые банки и кошельки, контролируйте баланс в одной панели.'
  },
  {
    icon: 'pi-chart-line',
    title: 'Глубокая аналитика',
    description: 'От диаграмм до прогнозов — принимайте решения на основе данных, а не интуиции.'
  },
  {
    icon: 'pi-tags',
    title: 'Умные категории',
    description: 'Автокатегоризация, гибкие фильтры и контроль обязательных платежей.'
  },
  {
    icon: 'pi-shield',
    title: 'Корпоративная защита',
    description: 'Шифрование, 2FA и приватность по умолчанию. Мы не продаем и не делимся данными.'
  }
] as const

const steps = [
  {
    number: '01',
    title: 'Подключите счета',
    description: 'Добавьте свои карты и кошельки — валюта и страна значения не имеют.'
  },
  {
    number: '02',
    title: 'Импортируйте операции',
    description: 'Загрузите CSV или подтягивайте движения автоматически через интеграции.'
  },
  {
    number: '03',
    title: 'Получайте инсайты',
    description: 'Отслеживайте динамику, ставьте цели и улучшайте финансовое здоровье.'
  }
] as const

const pricing = [
  {
    name: 'Starter',
    price: '0 ₽',
    accent: false,
    description: 'Для личного контроля расходов и простых бюджетов.',
    features: [
      'Неограниченные счета и категории',
      'Синхронизация банков вручную',
      'Базовая аналитика и экспорт CSV'
    ]
  },
  {
    name: 'Pro',
    price: '690 ₽',
    accent: true,
    description: 'Для продвинутых аналитиков и управления капиталом.',
    features: [
      'Автосинхронизация по API',
      'Прогнозирование и алерты',
      'Командный доступ и PDF-отчеты'
    ]
  }
] as const

const faq = [
  {
    question: 'FinTree действительно бесплатен?',
    answer: 'Тариф Starter останется бесплатным. Вы платите только за дополнительные инструменты и автоматизацию.'
  },
  {
    question: 'Как вы защищаете мои данные?',
    answer: 'Данные шифруются на клиенте, хранятся в изолированной инфраструктуре и не передаются третьим лицам.'
  },
  {
    question: 'Можно ли импортировать историю из банка?',
    answer: 'Да. Мы поддерживаем CSV, MT940 и прямые интеграции с банками и фин-сервисами.'
  },
  {
    question: 'Поддерживаете ли вы бизнес-пользователей?',
    answer: 'В Pro-доступе предусмотрены рабочие пространства, совместная работа и расширенные отчеты.'
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
              <span>Полный контроль личных финансов</span>
            </span>
            <h1 class="landing__hero-title">
              Финансовый помощник,<br>
              который работает за вас
            </h1>
            <p class="landing__hero-subtitle">
              Соедините счета, структурируйте расходы и моментально получайте аналитику, которой доверяют продвинутые инвесторы.
            </p>

            <div class="landing__hero-actions">
              <AppButton
                label="Начать бесплатно"
                icon="pi pi-arrow-right"
                icon-pos="right"
                size="lg"
                @click="router.push('/register')"
              />
              <AppButton
                label="Посмотреть веб-интерфейс"
                variant="ghost"
                size="lg"
                icon="pi pi-play"
                @click="scrollToSection('features')"
              />
            </div>

            <div class="landing__trust">
              <div class="landing__trust-item">
                <i class="pi pi-shield" />
                <span>Шифрование от клиента до сервера</span>
              </div>
              <div class="landing__trust-item">
                <i class="pi pi-check-circle" />
                <span>Данные остаются только у вас</span>
              </div>
              <div class="landing__trust-item">
                <i class="pi pi-sparkles" />
                <span>Готовый UI в тёмной теме</span>
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
                <span class="landing__hero-metric-label">Финансовое здоровье</span>
                <strong>82 / 100</strong>
                <small>+12 за последние 30 дней</small>
              </div>
              <div class="landing__hero-metric landing__hero-metric--split">
                <article>
                  <span class="landing__hero-metric-label">Подушка безопасности</span>
                  <strong>6.3 мес</strong>
                  <small>цель: 8 месяцев</small>
                </article>
                <article>
                  <span class="landing__hero-metric-label">Темп сбережений</span>
                  <strong>28%</strong>
                  <small>+6% к прошлому месяцу</small>
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
            <h2>Что делает FinTree удобным</h2>
            <p>Лучшие практики наблюдаемости и планирования денег в одном месте.</p>
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
            <h2>Три шага до полной прозрачности</h2>
            <p>Интеграция занимает меньше 5 минут — дальше система работает сама.</p>
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
            <h2>Прозрачные тарифы</h2>
            <p>Платите только за автоматизацию и расширенные отчеты — базовый контроль бесплатен.</p>
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
                <strong>{{ plan.price }}</strong>
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
                :label="plan.accent ? 'Попробовать 14 дней' : 'Начать бесплатно'"
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
            <h2>Готовы к спокойствию за финансы?</h2>
            <p>Запустите FinTree сегодня и получите прозрачность денежных потоков уже завтра.</p>
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
          <p>Интеллектуальный финансовый ассистент с тёплой тёмной темой.</p>
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
            <a href="#">Блог</a>
            <a href="#">Карьера</a>
          </div>
        </nav>
      </div>
      <div class="landing__footer-meta">
        <span>© {{ currentYear }} FinTree. Все права защищены.</span>
        <div class="landing__footer-meta-links">
          <a href="#">Политика конфиденциальности</a>
          <a href="#">Условия использования</a>
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
  background: radial-gradient(120% 120% at 50% -20%, rgba(59, 130, 246, 0.18), rgba(15, 20, 25, 0.98)),
    linear-gradient(180deg, rgba(15, 20, 25, 0.95) 0%, rgba(15, 20, 25, 1) 100%);
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
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.08);
  background: rgba(15, 20, 25, 0.72);
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
  color: var(--ft-text-primary);
}

.landing__brand i {
  color: var(--ft-primary-400);
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
  gap: var(--ft-space-3);
}

.landing__hero {
  position: relative;
}

.landing__hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 60% at 80% 20%, rgba(59, 130, 246, 0.28), transparent),
    radial-gradient(40% 40% at 10% 80%, rgba(236, 72, 153, 0.15), transparent);
  opacity: 0.6;
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
}

.landing__hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  border-radius: var(--ft-radius-full);
  padding: var(--ft-space-1) var(--ft-space-3);
  background: rgba(59, 130, 246, 0.12);
  color: var(--ft-primary-300);
  font-size: var(--ft-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.landing__hero-title {
  margin: 0;
  font-size: clamp(2.5rem, 4vw, 3.5rem);
  line-height: 1.1;
}

.landing__hero-subtitle {
  margin: 0;
  color: var(--ft-text-secondary);
  font-size: clamp(var(--ft-text-base), 2.2vw, 1.1rem);
  max-width: 42ch;
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
  background: rgba(148, 163, 184, 0.08);
  color: var(--ft-text-secondary);
}

.landing__hero-card {
  position: relative;
  overflow: hidden;
}

.landing__hero-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(13, 148, 136, 0.12));
  opacity: 0.4;
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
  background: rgba(148, 163, 184, 0.2);
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
}

.landing__section--alt {
  background: rgba(148, 163, 184, 0.04);
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
  font-size: clamp(1.75rem, 3vw, 2.5rem);
}

.landing__section-header p {
  margin: 0;
  color: var(--ft-text-secondary);
}

.landing__feature-card {
  gap: var(--ft-space-3);
  backdrop-filter: blur(12px);
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
  background: rgba(59, 130, 246, 0.16);
  color: var(--ft-primary-300);
  font-size: 1.5rem;
}

.landing__steps {
  gap: var(--ft-space-4);
}

.landing__step-card {
  gap: var(--ft-space-3);
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
}

.landing__pricing-card {
  gap: var(--ft-space-4);
}

.landing__pricing-card--accent {
  border-width: 2px;
  border-color: rgba(59, 130, 246, 0.6);
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
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(15, 118, 110, 0.16));
}

.landing__cta-inner {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--ft-space-6);
  align-items: center;
}

.landing__cta-inner h2 {
  margin: 0;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
}

.landing__cta-inner p {
  margin: var(--ft-space-2) 0 0;
  color: var(--ft-text-secondary);
}

.landing__footer {
  margin-top: auto;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 20, 25, 0.92);
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
  border-top: 1px solid rgba(148, 163, 184, 0.12);
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
    justify-content: space-between;
  }

  .landing__hero-actions {
    flex-direction: column;
  }
}
</style>
