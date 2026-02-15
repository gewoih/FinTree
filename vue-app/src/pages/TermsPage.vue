<script setup lang="ts">
import PublicPageLayout from '../components/layout/PublicPageLayout.vue';
import UiCard from '@/ui/UiCard.vue';
</script>

<template>
  <PublicPageLayout
    title="Условия использования"
    subtitle="Пожалуйста, ознакомьтесь с основными правилами работы FinTree."
  >
    <UiCard
      variant="muted"
      padding="lg"
    >
      <h2>Назначение сервиса</h2>
      <p>
        FinTree помогает вести учёт расходов и анализировать личные финансы. Мы не даём
        индивидуальные финансовые рекомендации и не выступаем финансовым консультантом.
      </p>
    </UiCard>

    <UiCard
      variant="muted"
      padding="lg"
    >
      <h2>Ответственность пользователя</h2>
      <p>
        Вы самостоятельно вводите данные и принимаете решения на основе аналитики. Финансовые
        результаты зависят от ваших действий.
      </p>
    </UiCard>

    <UiCard
      variant="muted"
      padding="lg"
    >
      <h2>Пробный период и подписка</h2>
      <p>
        Новым пользователям доступен бесплатный пробный месяц. После этого доступ сохраняется по подписке.
        Актуальные условия публикуются на сайте.
      </p>
    </UiCard>

    <UiCard
      variant="muted"
      padding="lg"
    >
      <h2>Связь с нами</h2>
      <p>
        Если у вас есть вопросы по условиям использования, напишите на
        <a href="mailto:hello@fintree.app">hello@fintree.app</a>.
      </p>
    </UiCard>
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

a {
  color: var(--ft-text-link);
}

a:hover {
  color: var(--ft-text-link-hover);
}
</style>
