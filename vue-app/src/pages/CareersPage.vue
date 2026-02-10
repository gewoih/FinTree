<script setup lang="ts">
import PublicPageLayout from '../components/layout/PublicPageLayout.vue';
</script>

<template>
  <PublicPageLayout
    title="Карьера"
    subtitle="Мы строим простой и честный финансовый продукт. Если хотите присоединиться — напишите."
  >
    <AppCard
      variant="muted"
      padding="lg"
    >
      <h2>Открытые роли</h2>
      <p>
        Сейчас нет активных вакансий, но мы всегда рады сильным специалистам. Напишите нам на
        <a href="mailto:hello@fintree.app">hello@fintree.app</a> и расскажите о себе.
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
  color: var(--ft-text-secondary);
  line-height: 1.6;
}

a {
  color: var(--ft-text-link);
}

a:hover {
  color: var(--ft-text-link-hover);
}
</style>
