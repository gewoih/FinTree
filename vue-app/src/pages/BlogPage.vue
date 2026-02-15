<script setup lang="ts">
import PublicPageLayout from '../components/layout/PublicPageLayout.vue';
import AppCard from '../components/common/AppCard.vue';
</script>

<template>
  <PublicPageLayout
    title="Блог"
    subtitle="Здесь будут короткие статьи про финансовую дисциплину и работу с FinTree."
  >
    <AppCard
      variant="muted"
      padding="lg"
    >
      <h2>Скоро здесь появятся материалы</h2>
      <p>
        Мы готовим гайды по учёту расходов, финансовым привычкам и работе с аналитикой. Подпишитесь
        на рассылку или загляните позже.
      </p>
    </AppCard>
  </PublicPageLayout>
</template>

<style scoped>
h2 {
  margin: 0;
  font-size: var(--ft-text-lg);
  color: var(--ft-text-primary);
}

p {
  margin: 0;
  line-height: 1.6;
  color: var(--ft-text-secondary);
}
</style>
