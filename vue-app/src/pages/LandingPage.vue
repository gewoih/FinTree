<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    icon: 'pi-telegram',
    title: 'Учёт за 10 секунд',
    description: 'Пишете сумму боту в Telegram — трата записана. Без открытия приложений, без ручного ввода в таблицы.'
  },
  {
    icon: 'pi-chart-line',
    title: 'Аналитика, которая объясняет',
    description: 'Доля сбережений, чистый поток, пики трат — конкретные цифры вместо абстрактных графиков.'
  },
  {
    icon: 'pi-wallet',
    title: 'Все деньги в одном месте',
    description: 'Счета, наличные и инвестиции — без разбросанных таблиц и приложений.'
  },
  {
    icon: 'pi-shield',
    title: 'Ваши данные — только ваши',
    description: 'Без подключения к банкам, без продажи данных. Вы вводите всё сами — и контролируете всё сами.'
  }
] as const

const steps = [
  {
    number: '01',
    title: 'Привяжите Telegram',
    description: 'Отправьте /id боту @financetree_bot и вставьте цифры в профиле FinTree. Займёт 2 минуты.'
  },
  {
    number: '02',
    title: 'Записывайте траты',
    description: 'Пишите боту «кофе 350» или «продукты 2800». Можно вносить пачкой из заметок.'
  },
  {
    number: '03',
    title: 'Смотрите результат',
    description: 'Через неделю веб-кабинет покажет, куда уходят деньги и сколько вы реально откладываете.'
  }
] as const

const problems = [
  {
    icon: 'pi-file-excel',
    text: 'Завели таблицу для бюджета — забросили через неделю',
    color: 'var(--ft-warning-500)',
    bg: 'color-mix(in srgb, var(--ft-warning-500) 18%, transparent)'
  },
  {
    icon: 'pi-credit-card',
    text: 'Подключили банк-приложение — но категории не те, а разбираться долго',
    color: 'var(--ft-danger-400)',
    bg: 'color-mix(in srgb, var(--ft-danger-400) 18%, transparent)'
  },
  {
    icon: 'pi-question-circle',
    text: 'В конце месяца непонятно, куда делись деньги',
    color: 'var(--ft-info-400)',
    bg: 'color-mix(in srgb, var(--ft-info-400) 18%, transparent)'
  }
] as const

const comparisonFeatures = [
  { label: 'Ввод за 10 секунд', fintree: true, excel: false, bank: false, zen: false },
  { label: 'Без подключения банка', fintree: true, excel: true, bank: false, zen: false },
  { label: 'Telegram-бот', fintree: true, excel: false, bank: false, zen: false },
  { label: 'Аналитика по делу', fintree: true, excel: false, bank: true, zen: true },
  { label: 'Настройка за 2 минуты', fintree: true, excel: false, bank: false, zen: false },
  { label: 'Контроль данных', fintree: true, excel: true, bank: false, zen: false }
] as const

const sharedPricingFeatures = [
  'Telegram-бот для учёта расходов',
  'Полная аналитика бюджета и капитала',
  'Счета, категории и инвестиции',
  'Без ограничений функций'
] as const

const pricing = [
  {
    name: 'Месяц',
    price: '390 ₽',
    subprice: '1 месяц бесплатно для новых',
    accent: false
  },
  {
    name: 'Год',
    price: '3 900 ₽',
    subprice: 'Экономия 780 ₽ — цена 10 месяцев',
    accent: true,
    badge: 'Выгодно'
  }
] as const

const faq = [
  {
    question: 'Зачем вводить вручную, если есть банковские приложения?',
    answer: 'Ручной ввод занимает 10 секунд через Telegram — быстрее, чем разбирать автоматические категории банка. А ещё вы осознанно фиксируете каждую трату, что формирует привычку контроля.'
  },
  {
    question: 'Как привязать Telegram?',
    answer: 'Отправьте боту @financetree_bot команду /id, скопируйте цифры и вставьте в профиле FinTree. Вся настройка — 2 минуты.'
  },
  {
    question: 'Что будет после бесплатного месяца?',
    answer: 'Вы сможете продолжить по подписке: 390 ₽/месяц или 3 900 ₽/год. Без автопродления — оплата только когда решите сами.'
  },
  {
    question: 'Безопасно ли хранить финансовые данные?',
    answer: 'Мы не подключаемся к банкам и не получаем доступ к вашим счетам. Все данные вводятся вами и хранятся только в FinTree. Доступ к ним есть только у вас.'
  },
  {
    question: 'Чем FinTree отличается от Дзен-мани и аналогов?',
    answer: 'FinTree проще: ввод через Telegram за секунды, без обязательной привязки банка и сложной настройки. Аналитика понятная и по делу — без десятков вкладок и графиков.'
  },
  {
    question: 'Можно ли использовать без Telegram?',
    answer: 'Telegram-бот — основной способ ввода, но вы можете добавлять операции и через веб-интерфейс. Бот просто делает это быстрее.'
  }
] as const

const expandedIndex = ref<number | null>(0)
const showMobileCta = ref(false)

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

const handleScroll = () => {
  const heroEl = document.getElementById('hero')
  const pricingEl = document.getElementById('pricing')
  if (!heroEl || !pricingEl) return

  const heroBottom = heroEl.getBoundingClientRect().bottom
  const pricingTop = pricingEl.getBoundingClientRect().top

  showMobileCta.value = heroBottom < 0 && pricingTop > window.innerHeight
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
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
            class="landing__actions-login"
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
      <!-- Hero -->
      <section
        id="hero"
        class="landing__hero"
      >
        <div class="landing__container landing__hero-layout">
          <div class="landing__hero-copy">
            <span class="landing__hero-badge">
              <i
                class="pi pi-gift"
                aria-hidden="true"
              />
              <span>Бесплатный месяц для новых пользователей</span>
            </span>
            <h1 class="landing__hero-title">
              Учёт расходов за 10 секунд —<br>
              прямо в Telegram
            </h1>
            <p class="landing__hero-subtitle">
              Пишете трату боту — видите аналитику на сайте. Без таблиц, без подключения банков, без лишних шагов.
            </p>

            <div class="landing__hero-actions">
              <AppButton
                label="Попробовать бесплатно"
                icon="pi pi-arrow-right"
                icon-pos="right"
                size="lg"
                @click="router.push('/register')"
              />
              <AppButton
                label="Как это работает ↓"
                variant="ghost"
                size="lg"
                @click="scrollToSection('steps')"
              />
            </div>

            <div class="landing__trust">
              <div class="landing__trust-item">
                <i class="pi pi-credit-card" />
                <span>Без привязки карты</span>
              </div>
              <div class="landing__trust-item">
                <i class="pi pi-shield" />
                <span>Данные не покидают FinTree</span>
              </div>
              <div class="landing__trust-item">
                <i class="pi pi-clock" />
                <span>Настройка за 2 минуты</span>
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
                <span>Ваша аналитика через неделю</span>
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

      <!-- Social Proof Bar -->
      <section class="landing__social-proof">
        <div class="landing__container landing__social-proof-inner">
          <!-- [нужны данные] — заменить на реальные метрики когда будут доступны -->
          <div class="landing__social-proof-item">
            <strong>500+</strong>
            <!-- [нужны данные] -->
            <span>операций записано</span>
          </div>
          <div class="landing__social-proof-divider" />
          <div class="landing__social-proof-item">
            <strong>10 сек</strong>
            <span>среднее время ввода</span>
          </div>
          <div class="landing__social-proof-divider" />
          <div class="landing__social-proof-item">
            <strong>2 мин</strong>
            <span>на настройку</span>
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
            <p>FinTree решает это проще: пишете боту в Telegram — получаете ясную картину бюджета на сайте.</p>
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
            <p>Telegram для ввода, веб — для аналитики и выводов.</p>
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

          <div class="landing__steps-cta">
            <AppButton
              label="Попробовать бесплатно"
              icon="pi pi-arrow-right"
              icon-pos="right"
              size="lg"
              @click="router.push('/register')"
            />
          </div>
        </div>
      </section>

      <!-- Comparison Table -->
      <section class="landing__section">
        <div class="landing__container">
          <header class="landing__section-header">
            <h2>FinTree vs альтернативы</h2>
            <p>Сравнение по ключевым критериям.</p>
          </header>

          <div class="landing__comparison-wrapper">
            <table class="landing__comparison">
              <thead>
                <tr>
                  <th />
                  <th class="landing__comparison-highlight">
                    FinTree
                  </th>
                  <th>Excel / Таблицы</th>
                  <th>Банк-приложение</th>
                  <th>Дзен-мани</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in comparisonFeatures"
                  :key="row.label"
                >
                  <td>{{ row.label }}</td>
                  <td class="landing__comparison-highlight">
                    <i
                      :class="['pi', row.fintree ? 'pi-check' : 'pi-times']"
                      :style="{ color: row.fintree ? 'var(--ft-success-400)' : 'var(--ft-text-tertiary)' }"
                    />
                  </td>
                  <td>
                    <i
                      :class="['pi', row.excel ? 'pi-check' : 'pi-times']"
                      :style="{ color: row.excel ? 'var(--ft-success-400)' : 'var(--ft-text-tertiary)' }"
                    />
                  </td>
                  <td>
                    <i
                      :class="['pi', row.bank ? 'pi-check' : 'pi-times']"
                      :style="{ color: row.bank ? 'var(--ft-success-400)' : 'var(--ft-text-tertiary)' }"
                    />
                  </td>
                  <td>
                    <i
                      :class="['pi', row.zen ? 'pi-check' : 'pi-times']"
                      :style="{ color: row.zen ? 'var(--ft-success-400)' : 'var(--ft-text-tertiary)' }"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
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
            <h2>Прозрачная подписка</h2>
            <p>Полный доступ без ограничений. Бесплатный месяц для новых пользователей.</p>
          </header>

          <div class="landing__pricing-shared">
            <h4>Что входит в оба тарифа:</h4>
            <ul>
              <li
                v-for="feat in sharedPricingFeatures"
                :key="feat"
              >
                <i
                  class="pi pi-check"
                  aria-hidden="true"
                />
                <span>{{ feat }}</span>
              </li>
            </ul>
          </div>

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
                  <div class="landing__pricing-title-row">
                    <h3>{{ plan.name }}</h3>
                    <span
                      v-if="'badge' in plan && plan.badge"
                      class="landing__pricing-badge"
                    >{{ plan.badge }}</span>
                  </div>
                </div>
                <div class="landing__pricing-price">
                  <strong>{{ plan.price }}</strong>
                  <span v-if="plan.subprice">{{ plan.subprice }}</span>
                </div>
              </header>

              <AppButton
                label="Начать бесплатно"
                block
                :variant="plan.accent ? 'primary' : 'ghost'"
                @click="router.push('/register')"
              />
            </AppCard>
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

      <!-- Final CTA -->
      <section class="landing__cta">
        <div class="landing__container landing__cta-inner">
          <div>
            <h2>Попробуйте — первый месяц бесплатно</h2>
            <p>Начните записывать траты сегодня и увидите первые выводы уже через неделю.</p>
          </div>
          <AppButton
            label="Создать аккаунт бесплатно"
            icon="pi pi-arrow-right"
            icon-pos="right"
            size="lg"
            @click="router.push('/register')"
          />
        </div>
      </section>
    </main>

    <!-- Sticky Mobile CTA -->
    <transition name="mobile-cta">
      <div
        v-show="showMobileCta"
        class="landing__mobile-cta"
      >
        <AppButton
          label="Попробовать бесплатно"
          size="md"
          block
          @click="router.push('/register')"
        />
      </div>
    </transition>

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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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
  color: var(--ft-text-primary);
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

/* ── Hero ── */

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
  width: fit-content;
}

.landing__hero-title {
  margin: 0;
  font-size: clamp(2.2rem, 4vw, 3.6rem);
  line-height: 1.1;
  font-family: var(--ft-font-display);
  letter-spacing: -0.02em;
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
  font-size: var(--ft-text-sm);
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

/* ── Social Proof Bar ── */

.landing__social-proof {
  background: var(--ft-bg-subtle);
  border-top: 1px solid var(--ft-border-subtle);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.landing__social-proof-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(var(--ft-space-6), 5vw, var(--ft-space-10));
  padding-block: var(--ft-space-5);
  flex-wrap: wrap;
}

.landing__social-proof-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ft-space-1);
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
  border: 1px solid var(--ft-border-subtle);
  background: var(--ft-surface-base);
  text-align: center;
}

.landing__problem-card p {
  margin: 0;
  color: var(--ft-text-secondary);
  font-size: var(--ft-text-base);
}

.landing__problem-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: var(--ft-radius-lg);
  font-size: 1.5rem;
  margin: 0 auto;
}

.landing__solution-bridge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ft-space-3);
  margin-top: clamp(var(--ft-space-6), 4vw, var(--ft-space-8));
  text-align: center;
}

.landing__solution-bridge i {
  font-size: 1.5rem;
  color: var(--ft-primary-500);
}

.landing__solution-bridge p {
  margin: 0;
  max-width: 56ch;
  color: var(--ft-text-primary);
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-medium);
}

/* ── Sections (shared) ── */

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

/* ── Features ── */

.landing__feature-card {
  gap: var(--ft-space-3);
  border: 1px solid var(--ft-border-subtle);
  background: var(--ft-surface-base);
  transition: transform var(--ft-transition-fast), border-color var(--ft-transition-fast), box-shadow var(--ft-transition-fast);
  animation: fadeUp 680ms var(--ft-ease-in-out) both;
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
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: var(--ft-radius-lg);
  background: color-mix(in srgb, var(--ft-primary-500) 20%, transparent);
  color: var(--ft-primary-500);
  font-size: 1.5rem;
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
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ft-primary-300);
}

.landing__steps-cta {
  display: flex;
  justify-content: center;
  margin-top: clamp(var(--ft-space-6), 4vw, var(--ft-space-8));
}

/* ── Comparison Table ── */

.landing__comparison-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--ft-radius-xl);
  border: 1px solid var(--ft-border-subtle);
}

.landing__comparison {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  font-size: var(--ft-text-sm);
  background: var(--ft-surface-base);
}

.landing__comparison th,
.landing__comparison td {
  padding: var(--ft-space-3) var(--ft-space-4);
  text-align: center;
  border-bottom: 1px solid var(--ft-border-subtle);
}

.landing__comparison th:first-child,
.landing__comparison td:first-child {
  text-align: left;
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.landing__comparison th {
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-secondary);
  background: var(--ft-bg-subtle);
  white-space: nowrap;
}

.landing__comparison tbody tr:last-child td {
  border-bottom: none;
}

.landing__comparison-highlight {
  background: color-mix(in srgb, var(--ft-primary-500) 8%, transparent);
  color: var(--ft-primary-500);
  font-weight: var(--ft-font-bold);
}

/* ── Pricing ── */

.landing__pricing-shared {
  max-width: 480px;
  margin: 0 auto clamp(var(--ft-space-6), 4vw, var(--ft-space-8));
  text-align: center;
}

.landing__pricing-shared h4 {
  margin: 0 0 var(--ft-space-3);
  font-size: var(--ft-text-base);
  color: var(--ft-text-secondary);
  font-weight: var(--ft-font-medium);
}

.landing__pricing-shared ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}

.landing__pricing-shared li {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ft-space-2);
  color: var(--ft-text-secondary);
}

.landing__pricing-shared li i {
  color: var(--ft-success-400);
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

.landing__pricing-title-row {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
}

.landing__pricing-header h3 {
  margin: 0;
  font-size: var(--ft-text-xl);
}

.landing__pricing-badge {
  display: inline-block;
  padding: var(--ft-space-1) var(--ft-space-2);
  border-radius: var(--ft-radius-full);
  background: color-mix(in srgb, var(--ft-success-500) 20%, transparent);
  color: var(--ft-success-400);
  font-size: var(--ft-text-xs);
  font-weight: var(--ft-font-semibold);
  letter-spacing: 0.04em;
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

/* ── Final CTA ── */

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

/* ── Sticky Mobile CTA ── */

.landing__mobile-cta {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--ft-z-sticky);
  padding: var(--ft-space-3) var(--ft-space-4);
  background: color-mix(in srgb, var(--ft-bg-base) 92%, transparent);
  backdrop-filter: blur(14px);
  border-top: 1px solid var(--ft-border-subtle);
  display: none;
}

.mobile-cta-enter-active,
.mobile-cta-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.mobile-cta-enter-from,
.mobile-cta-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* ── Footer ── */

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

/* ── Light mode overrides ── */

.light-mode .landing__hero-badge {
  color: var(--ft-primary-700);
}

/* ── Animations ── */

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

/* ── Responsive ── */

@media (max-width: 960px) {
  .landing__links {
    display: none;
  }

  .landing__hero-metric--split {
    grid-template-columns: 1fr;
  }

  .landing__social-proof-divider {
    display: none;
  }
}

@media (max-width: 640px) {
  .landing__nav-inner {
    flex-direction: row;
    align-items: center;
  }

  .landing__actions-login {
    display: none;
  }

  .landing__hero-actions {
    flex-direction: column;
  }

  .landing__hero-card {
    display: none;
  }

  .landing__mobile-cta {
    display: block;
  }

  .landing__trust {
    grid-template-columns: 1fr;
  }

  .landing__comparison-wrapper {
    margin-inline: calc(-1 * clamp(var(--ft-space-4), 5vw, var(--ft-space-8)));
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}
</style>
