<script setup lang="ts">
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useRouter } from 'vue-router';

const router = useRouter();

const features = [
  {
    icon: 'pi pi-check-circle',
    title: 'Управление счетами',
    caption: 'Отмечайте основной счет и работайте с мультивалютностью без лишних шагов.',
  },
  {
    icon: 'pi pi-filter',
    title: 'Умные фильтры',
    caption: 'Ищите операции по счетам, периодам и категориям — мгновенно и без перезагрузки.',
  },
  {
    icon: 'pi pi-shield',
    title: 'Системные категории',
    caption: 'Встроенные категории защищены от удаления, чтобы структура всегда была стабильной.',
  },
];
</script>

<template>
  <div class="page home ft-section">
    <section class="ft-hero">
      <div class="ft-hero__content">
        <span class="ft-kicker">Для личного и семейного бюджета</span>
        <h1 class="ft-display ft-display--hero">Финансы под контролем без бесконечных таблиц.</h1>
        <p class="ft-text ft-text--muted">
          FinTree объединяет счета, категории и операции в одном месте.
          Добавляйте расходы за пару кликов, а остальную рутину мы возьмем на себя.
        </p>
        <div class="ft-hero__actions">
          <Button
            label="Начать учет"
            icon="pi pi-play"
            size="large"
            severity="success"
            @click="router.push({ name: 'expenses' })"
          />
          <Button
            label="Посмотреть счета"
            icon="pi pi-wallet"
            size="large"
            outlined
            @click="router.push({ name: 'accounts' })"
          />
        </div>
      </div>

      <div class="hero-card-wrapper">
        <Card class="ft-card ft-card--glass hero-card">
          <template #title>
            <span class="hero-card__title">Что внутри?</span>
          </template>
          <template #content>
            <ul class="hero-card__list">
              <li><i class="pi pi-check" /> Живая лента расходов с фильтрами</li>
              <li><i class="pi pi-check" /> Управление мультивалютными счетами</li>
              <li><i class="pi pi-check" /> Системные категории с защитой</li>
              <li><i class="pi pi-check" /> Интуитивный интерфейс на PrimeVue</li>
            </ul>
          </template>
        </Card>
      </div>
    </section>

    <section class="ft-section">
      <div class="ft-section__head">
        <span class="ft-kicker">Основные возможности</span>
        <h2 class="ft-display ft-display--section">Что дает FinTree</h2>
      </div>

      <div class="ft-grid ft-grid--auto">
        <article v-for="feature in features" :key="feature.title" class="ft-card feature-card">
          <div class="feature-card__icon">
            <i :class="feature.icon" />
          </div>
          <h4>{{ feature.title }}</h4>
          <p>{{ feature.caption }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page.home {
  gap: clamp(2.5rem, 3vw, 3.5rem);
}

.hero-card-wrapper {
  display: flex;
  align-items: stretch;
}

.hero-card {
  width: 100%;
  position: relative;
  overflow: hidden;
}

.hero-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(56, 189, 248, 0.28), transparent 60%);
  opacity: 0.6;
}

.hero-card__title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ft-heading);
  position: relative;
  z-index: 1;
}

.hero-card__list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: grid;
  gap: 0.75rem;
  color: var(--ft-text-strong);
  position: relative;
  z-index: 1;
}

.hero-card__list li {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.hero-card__list i {
  color: var(--ft-success);
}

.feature-card {
  gap: var(--ft-space-sm);
  position: relative;
  overflow: hidden;
}

.feature-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.16), transparent 45%);
  pointer-events: none;
}

.feature-card__icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: rgba(56, 189, 248, 0.18);
  display: grid;
  place-items: center;
  color: var(--ft-accent);
  font-size: 1.25rem;
  z-index: 1;
}

.feature-card h4 {
  margin: 0;
  font-size: 1.12rem;
  color: var(--ft-heading);
  z-index: 1;
}

.feature-card p {
  margin: 0;
  color: var(--ft-text-muted);
  z-index: 1;
}
</style>
