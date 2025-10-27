<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useRouter } from 'vue-router';
import { useFinanceStore } from '../stores/finance';

const router = useRouter();
const store = useFinanceStore();

const stats = computed(() => ({
  accounts: store.accounts.length,
  categories: store.categories.length,
  transactions: store.transactions.length,
}));

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
  <div class="page home">
    <section class="hero">
      <div class="hero__copy">
        <span class="hero__tag">Для личного и семейного бюджета</span>
        <h1>Финансы под контролем без бесконечных таблиц.</h1>
        <p>
          FinTree объединяет счета, категории и операции в одном месте.
          Добавляйте расходы за пару кликов, а остальную рутину мы возьмем на себя.
        </p>
        <div class="hero__actions">
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

      <div class="hero__panel">
        <Card class="hero-card">
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

    <section class="stats">
      <article class="stat-tile">
        <p class="stat-tile__label">Активные счета</p>
        <h3>{{ stats.accounts }}</h3>
        <small>Все счета подтягиваются из API — никаких моков.</small>
      </article>
      <article class="stat-tile">
        <p class="stat-tile__label">Категории</p>
        <h3>{{ stats.categories }}</h3>
        <small>Системные и пользовательские — управляются отдельно.</small>
      </article>
      <article class="stat-tile">
        <p class="stat-tile__label">Транзакции</p>
        <h3>{{ stats.transactions }}</h3>
        <small>Фильтруются по счетам, датам и тексту без задержек.</small>
      </article>
    </section>

    <section class="features">
      <article v-for="feature in features" :key="feature.title" class="feature-card">
        <div class="feature-card__icon">
          <i :class="feature.icon" />
        </div>
        <h4>{{ feature.title }}</h4>
        <p>{{ feature.caption }}</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.page.home {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding-bottom: 4rem;
}

.hero {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: stretch;
}

.hero__copy {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.08));
  border-radius: 28px;
  padding: 2.5rem 2.75rem;
  box-shadow: 0 26px 48px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hero__tag {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  color: var(--ft-accent);
  font-weight: 600;
}

.hero__copy h1 {
  margin: 0;
  font-size: clamp(2.2rem, 3vw, 2.9rem);
  line-height: 1.1;
  color: var(--ft-heading);
}

.hero__copy p {
  margin: 0;
  color: var(--ft-text);
  font-size: 1.05rem;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.hero__panel {
  display: flex;
  align-items: stretch;
}

.hero-card {
  width: 100%;
  border-radius: 28px;
  border: none;
  background: var(--ft-surface-elevated);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
}

.hero-card__title {
  font-size: 1.25rem;
  font-weight: 600;
}

.hero-card__list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: grid;
  gap: 0.75rem;
  color: var(--ft-text-strong);
}

.hero-card__list li {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.hero-card__list i {
  color: var(--ft-success);
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-tile {
  background: var(--ft-surface-elevated);
  border-radius: 20px;
  padding: 1.75rem;
  border: 1px solid var(--ft-border-soft);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-tile__label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.8rem;
  color: var(--ft-text-muted);
}

.stat-tile h3 {
  margin: 0;
  font-size: 2rem;
  color: var(--ft-heading);
}

.stat-tile small {
  color: var(--ft-text-muted);
}

.features {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.feature-card {
  background: var(--ft-surface-elevated);
  border-radius: 20px;
  padding: 1.8rem;
  border: 1px solid var(--ft-border-soft);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feature-card__icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.12);
  display: grid;
  place-items: center;
  color: var(--ft-accent);
  font-size: 1.25rem;
}

.feature-card h4 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--ft-heading);
}

.feature-card p {
  margin: 0;
  color: var(--ft-text-muted);
}

@media (max-width: 768px) {
  .hero__copy {
    padding: 2rem;
  }
}
</style>
