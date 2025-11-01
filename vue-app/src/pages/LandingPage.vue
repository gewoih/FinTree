<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const features = [
  {
    icon: 'pi-wallet',
    title: 'Multi-Currency Accounts',
    description: 'Track multiple bank accounts and cash wallets in different currencies with real-time balance updates.'
  },
  {
    icon: 'pi-tags',
    title: 'Smart Categories',
    description: 'Organize expenses with custom categories and automatic categorization for better spending insights.'
  },
  {
    icon: 'pi-chart-line',
    title: 'Powerful Analytics',
    description: 'Visualize your financial data with interactive charts, trends, and personalized spending reports.'
  },
  {
    icon: 'pi-shield',
    title: 'Bank-Grade Security',
    description: 'Your data is encrypted end-to-end with enterprise-level security and 2FA protection.'
  },
  {
    icon: 'pi-mobile',
    title: 'Works Everywhere',
    description: 'Access your finances on any device. Fully responsive design optimized for mobile, tablet, and desktop.'
  },
  {
    icon: 'pi-bolt',
    title: 'Lightning Fast',
    description: 'Built with modern technology for instant loading and real-time updates across all your devices.'
  }
]

const howItWorks = [
  {
    step: '1',
    title: 'Connect Your Accounts',
    description: 'Add your bank accounts and cash wallets in seconds. Support for multiple currencies.'
  },
  {
    step: '2',
    title: 'Track Expenses',
    description: 'Record transactions with categories, dates, and notes. Automatic categorization makes it effortless.'
  },
  {
    step: '3',
    title: 'Get Insights',
    description: 'View charts and analytics to understand your spending patterns and make smarter financial decisions.'
  }
]

const faq = [
  {
    question: 'Is FinTree free to use?',
    answer: 'Yes! FinTree offers a generous free tier that includes unlimited accounts, transactions, and basic analytics. Premium features are available for advanced users.'
  },
  {
    question: 'How secure is my data?',
    answer: 'We use bank-grade encryption (AES-256) to protect your data. All communication is encrypted with HTTPS, and we offer two-factor authentication for enhanced security.'
  },
  {
    question: 'Can I import my existing data?',
    answer: 'Yes, you can import transactions from CSV files. We also support direct bank connections through secure integrations (coming soon).'
  },
  {
    question: 'What currencies are supported?',
    answer: 'FinTree supports 150+ currencies including USD, EUR, GBP, KZT, RUB, and more. You can track multiple accounts in different currencies.'
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
          <a href="#features" class="landing__nav-link" @click.prevent="scrollToSection('features')">Features</a>
          <a href="#how-it-works" class="landing__nav-link" @click.prevent="scrollToSection('how-it-works')">How It Works</a>
          <a href="#pricing" class="landing__nav-link" @click.prevent="scrollToSection('pricing')">Pricing</a>
          <a href="#faq" class="landing__nav-link" @click.prevent="scrollToSection('faq')">FAQ</a>
        </div>

        <div class="landing__nav-actions">
          <Button
            label="Sign In"
            text
            @click="router.push('/login')"
          />
          <Button
            label="Get Started"
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
            <span>Smart Personal Finance Tracking</span>
          </div>

          <h1 class="landing__hero-title">
            Take Control of Your <span class="landing__hero-gradient">Finances</span>
          </h1>

          <p class="landing__hero-subtitle">
            Track spending, manage multiple accounts, and get powerful insights
            to make smarter financial decisions. All in one beautiful, secure platform.
          </p>

          <div class="landing__hero-actions">
            <Button
              label="Start Free"
              size="large"
              icon="pi pi-arrow-right"
              iconPos="right"
              @click="router.push('/register')"
            />
            <Button
              label="See How It Works"
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
              <span>Bank-grade security</span>
            </div>
            <div class="landing__trust-item">
              <i class="pi pi-lock" />
              <span>Encrypted data</span>
            </div>
            <div class="landing__trust-item">
              <i class="pi pi-check-circle" />
              <span>Free forever</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="landing__section">
      <div class="landing__container">
        <div class="landing__section-header">
          <h2 class="landing__section-title">Everything you need to manage your money</h2>
          <p class="landing__section-subtitle">
            Powerful features designed to give you complete control over your personal finances
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
          <h2 class="landing__section-title">Get started in 3 simple steps</h2>
          <p class="landing__section-subtitle">
            Start tracking your finances in minutes, no complicated setup required
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
          <h2 class="landing__security-title">Your data is safe with us</h2>
          <p class="landing__security-description">
            We use industry-leading encryption and security practices to protect your financial data.
            Your information is encrypted end-to-end, and we never share it with third parties.
          </p>
          <div class="landing__security-features">
            <div class="landing__security-feature">
              <i class="pi pi-check-circle" />
              <span>256-bit AES encryption</span>
            </div>
            <div class="landing__security-feature">
              <i class="pi pi-check-circle" />
              <span>Two-factor authentication</span>
            </div>
            <div class="landing__security-feature">
              <i class="pi pi-check-circle" />
              <span>HTTPS secure connection</span>
            </div>
            <div class="landing__security-feature">
              <i class="pi pi-check-circle" />
              <span>Regular security audits</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="landing__section landing__section--alt">
      <div class="landing__container">
        <div class="landing__section-header">
          <h2 class="landing__section-title">Simple, transparent pricing</h2>
          <p class="landing__section-subtitle">
            Start free and upgrade when you're ready for advanced features
          </p>
        </div>

        <div class="landing__pricing">
          <Card class="landing__pricing-card">
            <template #content>
              <div class="landing__pricing-header">
                <h3 class="landing__pricing-title">Free</h3>
                <div class="landing__pricing-price">
                  <span class="landing__pricing-amount">$0</span>
                  <span class="landing__pricing-period">/month</span>
                </div>
              </div>

              <ul class="landing__pricing-features">
                <li><i class="pi pi-check" /> Unlimited accounts</li>
                <li><i class="pi pi-check" /> Unlimited transactions</li>
                <li><i class="pi pi-check" /> Basic analytics</li>
                <li><i class="pi pi-check" /> Multi-currency support</li>
                <li><i class="pi pi-check" /> Mobile & desktop access</li>
              </ul>

              <Button
                label="Get Started"
                class="landing__pricing-cta"
                @click="router.push('/register')"
              />
            </template>
          </Card>

          <Card class="landing__pricing-card landing__pricing-card--featured">
            <template #content>
              <div class="landing__pricing-badge">Most Popular</div>

              <div class="landing__pricing-header">
                <h3 class="landing__pricing-title">Pro</h3>
                <div class="landing__pricing-price">
                  <span class="landing__pricing-amount">$9</span>
                  <span class="landing__pricing-period">/month</span>
                </div>
              </div>

              <ul class="landing__pricing-features">
                <li><i class="pi pi-check" /> Everything in Free</li>
                <li><i class="pi pi-check" /> Advanced analytics & reports</li>
                <li><i class="pi pi-check" /> Budget tracking</li>
                <li><i class="pi pi-check" /> Savings goals</li>
                <li><i class="pi pi-check" /> Bank integrations</li>
                <li><i class="pi pi-check" /> Export data (CSV, PDF)</li>
                <li><i class="pi pi-check" /> Priority support</li>
              </ul>

              <Button
                label="Start Free Trial"
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
          <h2 class="landing__section-title">Frequently asked questions</h2>
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
          <h2 class="landing__cta-title">Ready to take control of your finances?</h2>
          <p class="landing__cta-subtitle">
            Join thousands of users who are already making smarter financial decisions with FinTree
          </p>
          <Button
            label="Get Started Free"
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
            <p>Smart personal finance tracking for everyone</p>
          </div>

          <div class="landing__footer-links">
            <div class="landing__footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#security">Security</a>
            </div>

            <div class="landing__footer-column">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
            </div>

            <div class="landing__footer-column">
              <h4>Support</h4>
              <a href="#faq">FAQ</a>
              <a href="#">Help Center</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>

        <div class="landing__footer-bottom">
          <p>&copy; 2025 FinTree. All rights reserved.</p>
          <div class="landing__footer-legal">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
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
