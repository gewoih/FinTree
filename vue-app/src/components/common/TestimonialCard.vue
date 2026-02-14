<script setup lang="ts">
interface Props {
  name: string
  role: string
  quote: string
  highlight?: string
}

withDefaults(defineProps<Props>(), {
  highlight: ''
})

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
</script>

<template>
  <div class="testimonial-card">
    <div class="testimonial-card__header">
      <div class="testimonial-card__avatar">
        {{ getInitials(name) }}
      </div>
      <div class="testimonial-card__author">
        <strong class="testimonial-card__name">{{ name }}</strong>
        <span class="testimonial-card__role">{{ role }}</span>
      </div>
    </div>

    <blockquote class="testimonial-card__quote">
      "{{ quote }}"
    </blockquote>

    <div
      v-if="highlight"
      class="testimonial-card__highlight"
    >
      {{ highlight }}
    </div>
  </div>
</template>

<style scoped>
.testimonial-card {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);

  padding: var(--ft-space-5);

  background: var(--ft-surface-soft);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-xl);
  box-shadow: var(--ft-shadow-sm);

  transition:
    box-shadow var(--ft-transition-fast),
    border-color var(--ft-transition-fast),
    transform var(--ft-transition-fast);
}

.testimonial-card:hover {
  transform: translateY(-2px);
  border-color: var(--ft-border-default);
  box-shadow: var(--ft-shadow-card);
}

.testimonial-card__header {
  display: flex;
  gap: var(--ft-space-3);
  align-items: center;
}

.testimonial-card__avatar {
  display: grid;
  place-items: center;

  width: 48px;
  height: 48px;

  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-primary-100);

  background: linear-gradient(
    135deg,
    var(--ft-primary-500),
    var(--ft-primary-600)
  );
  border-radius: var(--ft-radius-full);
}

.dark-mode .testimonial-card__avatar {
  color: var(--ft-primary-50);
}

.testimonial-card__author {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-1);
}

.testimonial-card__name {
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-semibold);
  color: var(--ft-heading);
}

.testimonial-card__role {
  font-size: var(--ft-text-sm);
  color: var(--ft-text-muted);
}

.testimonial-card__quote {
  margin: 0;
  font-size: var(--ft-text-base);
  font-style: italic;
  line-height: 1.6;
  color: var(--ft-text);
}

.testimonial-card__highlight {
  padding: var(--ft-space-3) var(--ft-space-4);

  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-bold);
  color: var(--ft-success-700);
  text-align: center;

  background: color-mix(in srgb, var(--ft-success-500) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--ft-success-500) 25%, transparent);
  border-radius: var(--ft-radius-lg);
}

.dark-mode .testimonial-card__highlight {
  color: var(--ft-success-400);
  background: color-mix(in srgb, var(--ft-success-500) 18%, transparent);
  border-color: color-mix(in srgb, var(--ft-success-500) 35%, transparent);
}
</style>
