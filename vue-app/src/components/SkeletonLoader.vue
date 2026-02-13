<script setup lang="ts">
defineProps<{
  type?: 'text' | 'title' | 'card' | 'table' | 'stat';
  lines?: number;
}>();
</script>

<template>
  <div
    class="skeleton"
    :class="`skeleton--${type || 'text'}`"
  >
    <!-- Текстовые линии -->
    <template v-if="type === 'text' || !type">
      <div
        v-for="i in (lines || 3)"
        :key="i"
        class="skeleton__line"
        :class="{ 'skeleton__line--short': i === lines }"
      />
    </template>

    <!-- Заголовок -->
    <template v-if="type === 'title'">
      <div class="skeleton__line skeleton__line--title" />
      <div class="skeleton__line skeleton__line--subtitle" />
    </template>

    <!-- Карточка -->
    <template v-if="type === 'card'">
      <div class="skeleton__line skeleton__line--title" />
      <div class="skeleton__line" />
      <div class="skeleton__line" />
      <div class="skeleton__line skeleton__line--short" />
    </template>

    <!-- Статистика -->
    <template v-if="type === 'stat'">
      <div class="skeleton__line skeleton__line--label" />
      <div class="skeleton__line skeleton__line--value" />
      <div class="skeleton__line skeleton__line--meta" />
    </template>

    <!-- Таблица -->
    <template v-if="type === 'table'">
      <div
        v-for="row in 5"
        :key="row"
        class="skeleton__row"
      >
        <div class="skeleton__cell skeleton__cell--small" />
        <div class="skeleton__cell skeleton__cell--medium" />
        <div class="skeleton__cell skeleton__cell--large" />
        <div class="skeleton__cell skeleton__cell--small" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.skeleton__line {
  width: 100%;
  height: 16px;

  background: linear-gradient(
    90deg,
    rgb(148 163 184 / 8%) 0%,
    rgb(148 163 184 / 15%) 50%,
    rgb(148 163 184 / 8%) 100%
  );
  background-size: 200% 100%;
  border-radius: 8px;

  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton__line--title {
  width: 60%;
  height: 28px;
  margin-bottom: 0.5rem;
}

.skeleton__line--subtitle {
  width: 40%;
  height: 18px;
}

.skeleton__line--short {
  width: 70%;
}

.skeleton__line--label {
  width: 50%;
  height: 12px;
}

.skeleton__line--value {
  width: 70%;
  height: 32px;
}

.skeleton__line--meta {
  width: 60%;
  height: 14px;
}

.skeleton__row {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid rgb(148 163 184 / 10%);
}

.skeleton__cell {
  height: 16px;

  background: linear-gradient(
    90deg,
    rgb(148 163 184 / 8%) 0%,
    rgb(148 163 184 / 15%) 50%,
    rgb(148 163 184 / 8%) 100%
  );
  background-size: 200% 100%;
  border-radius: 6px;

  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton__cell--small {
  width: 15%;
}

.skeleton__cell--medium {
  width: 25%;
}

.skeleton__cell--large {
  width: 40%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
