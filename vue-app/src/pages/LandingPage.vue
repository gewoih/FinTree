<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    icon: 'pi-wallet',
    title: 'Мультивалютные счета',
    description: 'Отслеживайте несколько банковских счетов и кошельков в разных валютах с обновлением баланса в реальном времени.'
  },
  {
    icon: 'pi-tags',
    title: 'Умные категории',
    description: 'Организуйте расходы с помощью пользовательских категорий и автоматической категоризации для лучшей аналитики.'
  },
  {
    icon: 'pi-chart-line',
    title: 'Мощная аналитика',
    description: 'Визуализируйте финансовые данные с помощью интерактивных графиков, трендов и персонализированных отчетов.'
  },
  {
    icon: 'pi-shield',
    title: 'Банковская безопасность',
    description: 'Ваши данные зашифрованы end-to-end с корпоративным уровнем безопасности и защитой 2FA.'
  },
  {
    icon: 'pi-mobile',
    title: 'Работает везде',
    description: 'Доступ к финансам с любого устройства. Адаптивный дизайн для мобильных, планшетов и десктопов.'
  },
  {
    icon: 'pi-bolt',
    title: 'Молниеносная скорость',
    description: 'Построен на современных технологиях для мгновенной загрузки и обновлений в реальном времени.'
  }
]

const howItWorks = [
  {
    step: '1',
    title: 'Подключите счета',
    description: 'Добавьте банковские счета и кошельки за секунды. Поддержка нескольких валют.'
  },
  {
    step: '2',
    title: 'Отслеживайте расходы',
    description: 'Записывайте транзакции с категориями, датами и заметками. Автоматическая категоризация упрощает процесс.'
  },
  {
    step: '3',
    title: 'Получайте аналитику',
    description: 'Просматривайте графики и аналитику, чтобы понять свои траты и принимать умные финансовые решения.'
  }
]

const faq = [
  {
    question: 'FinTree бесплатный?',
    answer: 'Да! FinTree предлагает щедрый бесплатный тариф с неограниченным количеством счетов, транзакций и базовой аналитикой. Премиум-функции доступны для продвинутых пользователей.'
  },
  {
    question: 'Насколько безопасны мои данные?',
    answer: 'Мы используем банковское шифрование (AES-256) для защиты ваших данных. Вся связь зашифрована HTTPS, и мы предлагаем двухфакторную аутентификацию для усиленной безопасности.'
  },
  {
    question: 'Могу ли я импортировать существующие данные?',
    answer: 'Да, вы можете импортировать транзакции из CSV файлов. Мы также поддерживаем прямое подключение к банкам через безопасные интеграции (скоро).'
  },
  {
    question: 'Какие валюты поддерживаются?',
    answer: 'FinTree поддерживает более 150 валют, включая USD, EUR, GBP, KZT, RUB и другие. Вы можете отслеживать несколько счетов в разных валютах.'
  }
]

const expandedIndex = ref<number | null>(null)

const toggleFaq = (index: number) => {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="landing">
    <!-- Navigation -->
    <nav class="landing__nav">
      <div class="landing__nav-container">
        <router-link to="/" class="landing__logo">
          <i class="pi pi-chart-bar" />
          <span>FinTree</span>
        </router-link>

        <div class="landing__nav-links">
          <a href="#features" class="landing__nav-link" @click.prevent="scrollToSection('features')">Возможности</a>
          <a href="#how-it-works" class="landing__nav-link" @click.prevent="scrollToSection('how-it-works')">Как это работает</a>
          <a href="#pricing" class="landing__nav-link" @click.prevent="scrollToSection('pricing')">Тарифы</a>
          <a href="#faq" class="landing__nav-link" @click.prevent="scrollToSection('faq')">FAQ</a>
        </div>

        <div class="landing__nav-actions">
          <Button
            label="Войти"
            text
            @click="router.push('/login')"
          />
          <Button
            label="Начать"
            @click="router.push('/register')"
          />
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="landing__hero">
      <div class="landing__container">
        <div class="landing__hero-content">
          <div class="landing__hero-badge">
            <i class="pi pi-bolt" />
            <span>Умное управление личными финансами</span>
          </div>

          <h1 class="landing__hero-title">
            Возьмите под контроль свои <span class="landing__hero-gradient">Финансы</span>
          </h1>

          <p class="landing__hero-subtitle">
            Отслеживайте расходы, управляйте несколькими счетами и получайте мощную аналитику
            для принятия умных финансовых решений. Все на одной красивой и безопасной платформе.
          </p>

          <div class="landing__hero-actions">
            <Button
              label="Начать бесплатно"
              size="large"
              icon="pi pi-arrow-right"
              iconPos="right"
              @click="router.push('/register')"
            />
            <Button
              label="Как это работает"
              size="large"
              severity="secondary"
              outlined
              icon="pi pi-play"
              @click="scrollToSection('how-it-works')"
            />
          </div>

          <div class="landing__hero-trust">
            <div class="landing__trust-item">
              <i class="pi pi-shield" />
              <span>Банковский уровень безопасности</span>
            </div>
            <div class="landing__trust-item">
              <i class="pi pi-lock" />
              <span>Зашифрованные данные</span>
            </div>
            <div class="landing__trust-item">
              <i class="pi pi-check-circle" />
              <span>Бесплатно навсегда</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="landing__section">
      <div class="landing__container">
        <div class="landing__section-header">
          <h2 class="landing__section-title">Все необходимое для управления деньгами</h2>
          <p class="landing__section-subtitle">
            Мощные функции для полного контроля над вашими личными финансами
          </p>
        </div>

        <div class="landing__features-grid">
          <Card v-for="feature in features" :key="feature.title" class="landing__feature-card">
            <template #content>
              <div class="landing__feature-icon">
                <i :class="['pi', feature.icon]" />
              </div>
              <h3 class="landing__feature-title">{{ feature.title }}</h3>
              <p class="landing__feature-description">{{ feature.description }}</p>
            </template>
          </Card>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="landing__section landing__section--alt">
      <div class="landing__container">
        <div class="landing__section-header">
          <h2 class="landing__section-title">Начните за 3 простых шага</h2>
          <p class="landing__section-subtitle">
            Начните отслеживать свои финансы за считанные минуты без сложных настроек
          </p>
        </div>

        <div class="landing__steps">
          <div v-for="step in howItWorks" :key="step.step" class="landing__step">
            <div class="landing__step-number">{{ step.step }}</div>
            <h3 class="landing__step-title">{{ step.title }}</h3>
            <p class="landing__step-description">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Security Section -->
    <section class="landing__section">
      <div class="landing__container">
        <div class="landing__security">
          <div class="landing__security-icon">
            <i class="pi pi-shield" />
          </div>
          <h2 class="landing__security-title">Ваши данные в безопасности</h2>
          <p class="landing__security-description">
            Мы используем передовые методы шифрования для защиты ваших финансовых данных.
            Ваша информация зашифрована end-to-end, и мы никогда не передаем ее третьим лицам.
          </p>
          <div class="landing__security-features">
            <div class="landing__security-feature">
              <i class="pi pi-check-circle" />
              <span>256-битное шифрование AES</span>
            </div>
            <div class="landing__security-feature">
              <i class="pi pi-check-circle" />
              <span>Двухфакторная аутентификация</span>
            </div>
            <div class="landing__security-feature">
              <i class="pi pi-check-circle" />
              <span>Защищенное HTTPS соединение</span>
            </div>
            <div class="landing__security-feature">
              <i class="pi pi-check-circle" />
              <span>Регулярные аудиты безопасности</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="landing__section landing__section--alt">
      <div class="landing__container">
        <div class="landing__section-header">
          <h2 class="landing__section-title">Простые и прозрачные цены</h2>
          <p class="landing__section-subtitle">
            Начните бесплатно и переходите на расширенные функции, когда будете готовы
          </p>
        </div>

        <div class="landing__pricing">
          <Card class="landing__pricing-card">
            <template #content>
              <div class="landing__pricing-header">
                <h3 class="landing__pricing-title">Бесплатно</h3>
                <div class="landing__pricing-price">
                  <span class="landing__pricing-amount">$0</span>
                  <span class="landing__pricing-period">/месяц</span>
                </div>
              </div>

              <ul class="landing__pricing-features">
                <li><i class="pi pi-check" /> Неограниченное количество счетов</li>
                <li><i class="pi pi-check" /> Неограниченное количество транзакций</li>
                <li><i class="pi pi-check" /> Базовая аналитика</li>
                <li><i class="pi pi-check" /> Поддержка мультивалют</li>
                <li><i class="pi pi-check" /> Доступ с мобильных и десктопов</li>
              </ul>

              <Button
                label="Начать"
                class="landing__pricing-cta"
                @click="router.push('/register')"
              />
            </template>
          </Card>

          <Card class="landing__pricing-card landing__pricing-card--featured">
            <template #content>
              <div class="landing__pricing-badge">Самый популярный</div>

              <div class="landing__pricing-header">
                <h3 class="landing__pricing-title">Pro</h3>
                <div class="landing__pricing-price">
                  <span class="landing__pricing-amount">$9</span>
                  <span class="landing__pricing-period">/месяц</span>
                </div>
              </div>

              <ul class="landing__pricing-features">
                <li><i class="pi pi-check" /> Все из бесплатного</li>
                <li><i class="pi pi-check" /> Продвинутая аналитика и отчеты</li>
                <li><i class="pi pi-check" /> Отслеживание бюджета</li>
                <li><i class="pi pi-check" /> Цели накоплений</li>
                <li><i class="pi pi-check" /> Интеграция с банками</li>
                <li><i class="pi pi-check" /> Экспорт данных (CSV, PDF)</li>
                <li><i class="pi pi-check" /> Приоритетная поддержка</li>
              </ul>

              <Button
                label="Начать пробный период"
                class="landing__pricing-cta"
                severity="contrast"
                @click="router.push('/register')"
              />
            </template>
          </Card>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section id="faq" class="landing__section">
      <div class="landing__container landing__container--narrow">
        <div class="landing__section-header">
          <h2 class="landing__section-title">Часто задаваемые вопросы</h2>
        </div>

        <div class="landing__faq">
          <div
            v-for="(item, index) in faq"
            :key="index"
            class="landing__faq-item"
            :class="{ 'landing__faq-item--expanded': expandedIndex === index }"
          >
            <button
              class="landing__faq-question"
              @click="toggleFaq(index)"
            >
              <span>{{ item.question }}</span>
              <i :class="['pi', expandedIndex === index ? 'pi-minus' : 'pi-plus']" />
            </button>
            <div v-show="expandedIndex === index" class="landing__faq-answer">
              {{ item.answer }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="landing__section landing__cta-section">
      <div class="landing__container">
        <div class="landing__cta">
          <h2 class="landing__cta-title">Готовы взять свои финансы под контроль?</h2>
          <p class="landing__cta-subtitle">
            Присоединяйтесь к тысячам пользователей, которые уже принимают умные финансовые решения с FinTree
          </p>
          <Button
            label="Начать бесплатно"
            size="large"
            icon="pi pi-arrow-right"
            iconPos="right"
            @click="router.push('/register')"
          />
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing__footer">
      <div class="landing__container">
        <div class="landing__footer-content">
          <div class="landing__footer-brand">
            <div class="landing__logo">
              <i class="pi pi-chart-bar" />
              <span>FinTree</span>
            </div>
            <p>Умное управление личными финансами для каждого</p>
          </div>

          <div class="landing__footer-links">
            <div class="landing__footer-column">
              <h4>Продукт</h4>
              <a href="#features">Возможности</a>
              <a href="#pricing">Тарифы</a>
              <a href="#security">Безопасность</a>
            </div>

            <div class="landing__footer-column">
              <h4>Компания</h4>
              <a href="#">О нас</a>
              <a href="#">Блог</a>
              <a href="#">Карьера</a>
            </div>

            <div class="landing__footer-column">
              <h4>Поддержка</h4>
              <a href="#faq">FAQ</a>
              <a href="#">Центр помощи</a>
              <a href="#">Контакты</a>
            </div>
          </div>
        </div>

        <div class="landing__footer-bottom">
          <p>&copy; 2025 FinTree. Все права защищены.</p>
          <div class="landing__footer-legal">
            <a href="#">Политика конфиденциальности</a>
            <a href="#">Условия использования</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100vh;
  background: var(--ft-bg-base);
}

/* Navigation */
.landing__nav {
  position: sticky;
  top: 0;
  z-index: var(--ft-z-sticky);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ft-border-subtle);
}

.dark-mode .landing__nav {
  background: rgba(11, 18, 32, 0.8);
}

.landing__nav-container {
  max-width: var(--ft-container-xl);
  margin: 0 auto;
  padding: var(--ft-space-4) var(--ft-space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ft-space-8);
}

.landing__logo {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  text-decoration: none;
}

.landing__logo i {
  font-size: 1.75rem;
  color: var(--ft-primary-600);
}

.landing__nav-links {
  display: none;
  gap: var(--ft-space-6);
}

@media (min-width: 768px) {
  .landing__nav-links {
    display: flex;
  }
}

.landing__nav-link {
  color: var(--ft-text-secondary);
  text-decoration: none;
  font-weight: var(--ft-font-medium);
  transition: color var(--ft-transition-fast);
}

.landing__nav-link:hover {
  color: var(--ft-primary-600);
}

.landing__nav-actions {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
}

/* Hero */
.landing__hero {
  padding: var(--ft-space-24) var(--ft-space-6) var(--ft-space-20);
  background:
    radial-gradient(ellipse at 50% 0%, rgba(37, 99, 235, 0.1), transparent 60%),
    var(--ft-bg-base);
}

.landing__container {
  max-width: var(--ft-container-xl);
  margin: 0 auto;
  padding: 0 var(--ft-space-6);
}

.landing__container--narrow {
  max-width: var(--ft-container-md);
}

.landing__hero-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.landing__hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--ft-space-2);
  padding: var(--ft-space-2) var(--ft-space-4);
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(34, 197, 94, 0.1) 100%
  );
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-full);
  color: var(--ft-primary-600);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  margin-bottom: var(--ft-space-6);
}

.landing__hero-title {
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  line-height: 1.1;
  margin: 0 0 var(--ft-space-6);
}

.landing__hero-gradient {
  background: linear-gradient(135deg, var(--ft-primary-600) 0%, var(--ft-success-500) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.landing__hero-subtitle {
  font-size: var(--ft-text-xl);
  color: var(--ft-text-secondary);
  line-height: var(--ft-leading-relaxed);
  margin: 0 0 var(--ft-space-10);
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.landing__hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ft-space-4);
  margin-bottom: var(--ft-space-12);
  flex-wrap: wrap;
}

.landing__hero-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ft-space-8);
  flex-wrap: wrap;
}

.landing__trust-item {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
}

.landing__trust-item i {
  color: var(--ft-success-500);
}

/* Sections */
.landing__section {
  padding: var(--ft-space-20) var(--ft-space-6);
}

.landing__section--alt {
  background: var(--ft-bg-subtle);
}

.landing__section-header {
  text-align: center;
  margin-bottom: var(--ft-space-16);
}

.landing__section-title {
  font-size: var(--ft-text-4xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  margin: 0 0 var(--ft-space-4);
}

.landing__section-subtitle {
  font-size: var(--ft-text-lg);
  color: var(--ft-text-secondary);
  max-width: 640px;
  margin: 0 auto;
}

/* Features */
.landing__features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--ft-space-6);
}

.landing__feature-card {
  text-align: center;
  transition: all var(--ft-transition-base);
  border: 1px solid var(--ft-border-subtle);
}

.landing__feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--ft-shadow-lg);
}

.landing__feature-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--ft-space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(34, 197, 94, 0.1) 100%
  );
  border-radius: var(--ft-radius-2xl);
  border: 1px solid var(--ft-border-subtle);
}

.landing__feature-icon i {
  font-size: 2rem;
  color: var(--ft-primary-600);
}

.landing__feature-title {
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  margin: 0 0 var(--ft-space-3);
}

.landing__feature-description {
  color: var(--ft-text-secondary);
  line-height: var(--ft-leading-relaxed);
  margin: 0;
}

/* How It Works */
.landing__steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--ft-space-8);
}

.landing__step {
  text-align: center;
}

.landing__step-number {
  width: 56px;
  height: 56px;
  margin: 0 auto var(--ft-space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--ft-primary-600) 0%, var(--ft-success-500) 100%);
  color: white;
  font-size: var(--ft-text-2xl);
  font-weight: var(--ft-font-bold);
  border-radius: 50%;
}

.landing__step-title {
  font-size: var(--ft-text-xl);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-text-primary);
  margin: 0 0 var(--ft-space-3);
}

.landing__step-description {
  color: var(--ft-text-secondary);
  line-height: var(--ft-leading-relaxed);
  margin: 0;
}

/* Security */
.landing__security {
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
}

.landing__security-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--ft-space-6);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.1) 0%,
    rgba(34, 197, 94, 0.1) 100%
  );
  border-radius: 50%;
  border: 1px solid var(--ft-border-subtle);
}

.landing__security-icon i {
  font-size: 2.5rem;
  color: var(--ft-primary-600);
}

.landing__security-title {
  font-size: var(--ft-text-3xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  margin: 0 0 var(--ft-space-4);
}

.landing__security-description {
  font-size: var(--ft-text-lg);
  color: var(--ft-text-secondary);
  line-height: var(--ft-leading-relaxed);
  margin: 0 0 var(--ft-space-8);
}

.landing__security-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--ft-space-4);
}

.landing__security-feature {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  color: var(--ft-text-secondary);
}

.landing__security-feature i {
  color: var(--ft-success-500);
}

/* Pricing */
.landing__pricing {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--ft-space-8);
  max-width: 900px;
  margin: 0 auto;
}

.landing__pricing-card {
  position: relative;
  border: 1px solid var(--ft-border-subtle);
  transition: all var(--ft-transition-base);
}

.landing__pricing-card--featured {
  border-color: var(--ft-primary-600);
  box-shadow: var(--ft-shadow-xl);
  transform: scale(1.05);
}

.landing__pricing-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--ft-space-2) var(--ft-space-4);
  background: linear-gradient(135deg, var(--ft-primary-600) 0%, var(--ft-success-500) 100%);
  color: white;
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  border-radius: var(--ft-radius-full);
}

.landing__pricing-header {
  text-align: center;
  padding-bottom: var(--ft-space-6);
  border-bottom: 1px solid var(--ft-border-subtle);
  margin-bottom: var(--ft-space-6);
}

.landing__pricing-title {
  font-size: var(--ft-text-2xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  margin: 0 0 var(--ft-space-4);
}

.landing__pricing-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--ft-space-2);
}

.landing__pricing-amount {
  font-size: 3rem;
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
}

.landing__pricing-period {
  color: var(--ft-text-tertiary);
}

.landing__pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--ft-space-8);
}

.landing__pricing-features li {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  padding: var(--ft-space-3) 0;
  color: var(--ft-text-secondary);
}

.landing__pricing-features i {
  color: var(--ft-success-500);
}

.landing__pricing-cta {
  width: 100%;
}

/* FAQ */
.landing__faq {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}

.landing__faq-item {
  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-xl);
  overflow: hidden;
}

.landing__faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ft-space-5) var(--ft-space-6);
  background: none;
  border: none;
  color: var(--ft-text-primary);
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-semibold);
  text-align: left;
  cursor: pointer;
  transition: background var(--ft-transition-fast);
}

.landing__faq-question:hover {
  background: var(--ft-bg-subtle);
}

.landing__faq-question i {
  color: var(--ft-primary-600);
}

.landing__faq-answer {
  padding: 0 var(--ft-space-6) var(--ft-space-5);
  color: var(--ft-text-secondary);
  line-height: var(--ft-leading-relaxed);
}

/* CTA Section */
.landing__cta-section {
  background:
    radial-gradient(ellipse at 50% 50%, rgba(37, 99, 235, 0.1), transparent 60%),
    var(--ft-bg-base);
}

.landing__cta {
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
}

.landing__cta-title {
  font-size: var(--ft-text-4xl);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
  margin: 0 0 var(--ft-space-4);
}

.landing__cta-subtitle {
  font-size: var(--ft-text-lg);
  color: var(--ft-text-secondary);
  margin: 0 0 var(--ft-space-8);
}

/* Footer */
.landing__footer {
  background: var(--ft-bg-subtle);
  border-top: 1px solid var(--ft-border-subtle);
  padding: var(--ft-space-16) var(--ft-space-6) var(--ft-space-8);
}

.landing__footer-content {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: var(--ft-space-12);
  margin-bottom: var(--ft-space-12);
}

@media (max-width: 768px) {
  .landing__footer-content {
    grid-template-columns: 1fr;
  }
}

.landing__footer-brand p {
  color: var(--ft-text-tertiary);
  margin: var(--ft-space-4) 0 0;
}

.landing__footer-links {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--ft-space-8);
}

@media (max-width: 640px) {
  .landing__footer-links {
    grid-template-columns: 1fr;
  }
}

.landing__footer-column h4 {
  color: var(--ft-text-primary);
  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 var(--ft-space-4);
}

.landing__footer-column a {
  display: block;
  color: var(--ft-text-tertiary);
  text-decoration: none;
  margin-bottom: var(--ft-space-3);
  transition: color var(--ft-transition-fast);
}

.landing__footer-column a:hover {
  color: var(--ft-primary-600);
}

.landing__footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--ft-space-8);
  border-top: 1px solid var(--ft-border-subtle);
  color: var(--ft-text-tertiary);
  font-size: var(--ft-text-sm);
}

@media (max-width: 640px) {
  .landing__footer-bottom {
    flex-direction: column;
    gap: var(--ft-space-4);
  }
}

.landing__footer-legal {
  display: flex;
  gap: var(--ft-space-6);
}

.landing__footer-legal a {
  color: var(--ft-text-tertiary);
  text-decoration: none;
  transition: color var(--ft-transition-fast);
}

.landing__footer-legal a:hover {
  color: var(--ft-primary-600);
}
</style>
