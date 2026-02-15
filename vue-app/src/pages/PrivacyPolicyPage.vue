<script setup lang="ts">
import PublicPageLayout from '../components/layout/PublicPageLayout.vue';
import AppCard from '../components/common/AppCard.vue';
</script>

<template>
  <PublicPageLayout
    title="Политика конфиденциальности"
    subtitle="Кратко о том, какие данные нужны FinTree и как мы их защищаем."
  >
    <AppCard
      variant="muted"
      padding="lg"
    >
      <h2>Какие данные мы собираем</h2>
      <ul>
        <li>Email и базовые настройки профиля.</li>
        <li>Telegram ID для привязки бота.</li>
        <li>Данные о счетах, транзакциях и категориях, которые вы вводите вручную.</li>
        <li>Технические логи для диагностики ошибок.</li>
      </ul>
    </AppCard>

    <AppCard
      variant="muted"
      padding="lg"
    >
      <h2>Как мы используем данные</h2>
      <ul>
        <li>Формируем аналитику бюджета и капиталов.</li>
        <li>Обеспечиваем работу Telegram-бота и веб-кабинета.</li>
        <li>Улучшаем продукт на основе обезличенной статистики.</li>
      </ul>
    </AppCard>

    <AppCard
      variant="muted"
      padding="lg"
    >
      <h2>Передача данных</h2>
      <p>
        Мы не подключаемся к вашим банкам, не продаем данные и не делимся ими с третьими лицами.
        Доступ к данным есть только у вас.
      </p>
    </AppCard>

    <AppCard
      variant="muted"
      padding="lg"
    >
      <h2>Связь с нами</h2>
      <p>
        Если есть вопросы по данным или нужна помощь, напишите нам на
        <a href="mailto:hello@fintree.app">hello@fintree.app</a>.
      </p>
    </AppCard>
  </PublicPageLayout>
</template>

<style scoped>
ul {
  display: grid;
  gap: var(--ft-space-2);

  margin: 0;
  padding-left: 1.2rem;

  color: var(--ft-text-secondary);
}

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
