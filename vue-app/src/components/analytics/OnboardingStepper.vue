<script setup lang="ts">
import { computed } from 'vue';
import UiCard from '@/ui/UiCard.vue';
import UiButton from '../../ui/UiButton.vue';

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
  actionLabel: string;
  actionTo: string;
}

const props = defineProps<{
  steps: OnboardingStep[];
  loading: boolean;
}>();

const emit = defineEmits<{
  'step-click': [step: OnboardingStep];
  'skip': [];
}>();

const requiredStepsCount = computed(() => props.steps.filter(step => !step.optional).length);

function formatStepsCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} шаг`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} шага`;
  return `${count} шагов`;
}

const subtitle = computed(
  () => `Пройдите ${formatStepsCount(requiredStepsCount.value)}, чтобы завершить настройку. Шаги открываются по порядку.`
);

const currentRequiredStepKey = computed(() => {
  const current = props.steps.find(step => !step.optional && !step.completed);
  return current?.key ?? null;
});

function getStepStatus(step: OnboardingStep): 'completed' | 'current' | 'locked' | 'optional' {
  if (step.completed) return 'completed';
  if (step.optional) return 'optional';
  if (step.key === currentRequiredStepKey.value) return 'current';
  return 'locked';
}

function shouldShowAction(step: OnboardingStep): boolean {
  const status = getStepStatus(step);
  return status === 'current' || status === 'optional';
}
</script>

<template>
  <UiCard
    class="onboarding-stepper"
    variant="muted"
    padding="lg"
  >
    <div class="onboarding-stepper__header">
      <h2 class="onboarding-stepper__title">
        Настройка аккаунта
      </h2>
      <p class="onboarding-stepper__subtitle">
        {{ subtitle }}
      </p>
    </div>

    <div class="onboarding-stepper__steps">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        class="onboarding-step"
        :class="[`onboarding-step--${getStepStatus(step)}`]"
      >
        <div class="onboarding-step__badge">
          <i
            v-if="getStepStatus(step) === 'completed'"
            class="pi pi-check"
          />
          <i
            v-else-if="getStepStatus(step) === 'locked'"
            class="pi pi-lock"
          />
          <i
            v-else-if="getStepStatus(step) === 'optional'"
            class="pi pi-sliders-h"
          />
          <span v-else>{{ index + 1 }}</span>
        </div>

        <div class="onboarding-step__content">
          <h3 class="onboarding-step__title">
            {{ step.title }}
          </h3>
          <p
            v-if="getStepStatus(step) === 'current' || getStepStatus(step) === 'optional'"
            class="onboarding-step__description"
          >
            {{ step.description }}
          </p>
        </div>

        <UiButton
          v-if="shouldShowAction(step)"
          :label="step.actionLabel"
          size="sm"
          :loading="loading"
          @click="emit('step-click', step)"
        />
      </div>
    </div>

    <button
      type="button"
      class="onboarding-stepper__skip"
      @click="emit('skip')"
    >
      Пропустить пока
    </button>
  </UiCard>
</template>

<style scoped>
.onboarding-stepper {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--ft-primary-500) 15%, transparent),
    color-mix(in srgb, var(--ft-info-500) 8%, transparent)
  );
  border: 1px solid var(--ft-border-subtle);
}

.onboarding-stepper__header {
  margin-bottom: var(--ft-space-2);
}

.onboarding-stepper__title {
  margin: 0;
  font-size: var(--ft-text-lg);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-primary);
}

.onboarding-stepper__subtitle {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.onboarding-stepper__steps {
  display: grid;
  gap: var(--ft-space-3);
}

.onboarding-step {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--ft-space-3);
  align-items: center;

  padding: var(--ft-space-3);

  background: var(--ft-surface-base);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);

  transition: opacity var(--ft-transition-fast);
}

.onboarding-step--completed {
  opacity: 0.6;
}

.onboarding-step--locked {
  opacity: 0.45;
}

.onboarding-step--optional {
  border-style: dashed;
  opacity: 0.92;
}

.onboarding-step__badge {
  display: grid;
  place-items: center;

  width: 36px;
  height: 36px;

  font-size: var(--ft-text-sm);
  font-weight: var(--ft-font-bold);
  color: var(--ft-text-inverse);

  background: color-mix(in srgb, var(--ft-primary-500) 55%, transparent);
  border-radius: 999px;
}

.onboarding-step--completed .onboarding-step__badge {
  color: var(--ft-success-400);
  background: rgb(16 185 129 / 20%);
}

.onboarding-step--locked .onboarding-step__badge {
  color: var(--ft-text-secondary);
  background: color-mix(in srgb, var(--ft-surface-raised) 80%, transparent);
}

.onboarding-step--optional .onboarding-step__badge {
  color: var(--ft-text-primary);
  background: color-mix(in srgb, var(--ft-info-500) 35%, transparent);
}

.onboarding-step__content {
  min-width: 0;
}

.onboarding-step__title {
  margin: 0;
  font-size: var(--ft-text-base);
  font-weight: var(--ft-font-medium);
  color: var(--ft-text-primary);
}

.onboarding-step--completed .onboarding-step__title {
  text-decoration: line-through;
  color: var(--ft-text-secondary);
}

.onboarding-step--locked .onboarding-step__title {
  color: var(--ft-text-secondary);
}

.onboarding-step--optional .onboarding-step__title {
  color: var(--ft-text-primary);
}

.onboarding-step__description {
  margin: var(--ft-space-1) 0 0;
  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);
}

.onboarding-stepper__skip {
  cursor: pointer;

  align-self: center;
  justify-self: center;

  padding: var(--ft-space-2) var(--ft-space-3);

  font-size: var(--ft-text-sm);
  color: var(--ft-text-secondary);

  background: none;
  border: none;

  transition: color var(--ft-transition-fast);
}

.onboarding-stepper__skip:hover {
  color: var(--ft-text-primary);
}

@media (width <= 640px) {
  .onboarding-step {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
  }

  .onboarding-step :deep(.ui-button) {
    grid-column: 1 / -1;
  }
}
</style>
