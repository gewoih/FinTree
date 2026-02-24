<script setup lang="ts">
import { ref } from 'vue';
import CategoryDeltaCard from '../components/analytics/CategoryDeltaCard.vue';
import EvolutionTab from '@/components/analytics/EvolutionTab.vue';
import ForecastCard from '../components/analytics/ForecastCard.vue';
import HealthScoreCard from '../components/analytics/HealthScoreCard.vue';
import OnboardingStepper from '../components/analytics/OnboardingStepper.vue';
import PeakDaysCard from '../components/analytics/PeakDaysCard.vue';
import SpendingBarsCard from '../components/analytics/SpendingBarsCard.vue';
import SpendingPieCard from '../components/analytics/SpendingPieCard.vue';
import SummaryStrip from '../components/analytics/SummaryStrip.vue';
import PageHeader from '../components/common/PageHeader.vue';
import PageContainer from '../components/layout/PageContainer.vue';
import { useAnalyticsPage } from '../composables/useAnalyticsPage';
import type { MonthPickerInstance } from '@/types/analytics-page';
import DatePicker from 'primevue/datepicker';
import Skeleton from 'primevue/skeleton';

const activeTab = ref<'current' | 'evolution'>('current');

const {
  analyticsReadiness,
  baseCurrency,
  canNavigateNext,
  categoryChartData,
  categoryDelta,
  categoryScopeOptions,
  dashboardError,
  dashboardLoading,
  expensesChartData,
  filteredCategoryLegend,
  forecastChartData,
  forecastReadinessMessage,
  forecastSummary,
  granularityOptions,
  healthCards,
  isAnalyticsReady,
  isFirstRun,
  isForecastAndStabilityReady,
  isOnboardingDataReady,
  maxMonthDate,
  monthPickerRef,
  onboardingSteps,
  peakDays,
  peakSummary,
  selectedCategoryScope,
  selectedGranularity,
  selectedMonth,
  selectedMonthLabel,
  summaryMetrics,
  goToNextMonth,
  goToPreviousMonth,
  handleCategorySelect,
  handlePeakSelect,
  handlePeakSummarySelect,
  handleSkipOnboarding,
  handleStepClick,
  openMonthPicker,
  retryDashboard,
  showRetrospectiveBanner,
  previousMonthStr,
  dismissRetrospectiveBanner,
  updateSelectedMonth,
} = useAnalyticsPage();

const bindMonthPickerRef = (instance: unknown) => {
  monthPickerRef.value = instance as MonthPickerInstance | null;
};
</script>

<template>
  <PageContainer class="analytics-page">
    <PageHeader title="Главная">
      <template
        v-if="!isFirstRun && isAnalyticsReady"
        #actions
      >
        <div class="analytics-month-selector">
          <button
            type="button"
            class="analytics-month-selector__button"
            aria-label="Предыдущий месяц"
            @click="goToPreviousMonth"
          >
            <i class="pi pi-chevron-left" />
          </button>
          <button
            type="button"
            class="analytics-month-selector__label"
            @click="openMonthPicker"
          >
            {{ selectedMonthLabel }}
          </button>
          <button
            type="button"
            class="analytics-month-selector__button"
            aria-label="Следующий месяц"
            :disabled="!canNavigateNext"
            @click="goToNextMonth"
          >
            <i class="pi pi-chevron-right" />
          </button>
          <DatePicker
            :ref="bindMonthPickerRef"
            :model-value="selectedMonth"
            view="month"
            date-format="MM yy"
            :manual-input="false"
            :max-date="maxMonthDate"
            class="analytics-month-selector__picker"
            append-to="body"
            @update:model-value="updateSelectedMonth"
          />
        </div>
      </template>
    </PageHeader>

    <div
      class="analytics-page__tabs"
      role="tablist"
    >
      <button
        role="tab"
        :aria-selected="activeTab === 'current'"
        class="analytics-page__tab"
        :class="{ 'analytics-page__tab--active': activeTab === 'current' }"
        @click="activeTab = 'current'"
      >
        Сейчас
      </button>
      <button
        role="tab"
        :aria-selected="activeTab === 'evolution'"
        class="analytics-page__tab"
        :class="{ 'analytics-page__tab--active': activeTab === 'evolution' }"
        @click="activeTab = 'evolution'"
      >
        Динамика
      </button>
    </div>

    <div v-show="activeTab === 'current'">
      <div
        v-if="showRetrospectiveBanner"
        class="analytics-page__retro-banner"
        role="alert"
      >
        <span>Прошлый месяц завершён. Хотите подвести итоги?</span>
        <div class="analytics-page__retro-banner-actions">
          <router-link
            :to="`/reflections/${previousMonthStr}`"
            class="analytics-page__retro-banner-link"
          >
            Подвести итоги
          </router-link>
          <button
            type="button"
            class="analytics-page__retro-banner-close"
            aria-label="Закрыть напоминание"
            @click="dismissRetrospectiveBanner"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        v-if="isFirstRun && !isOnboardingDataReady"
        class="analytics-onboarding-skeleton"
      >
        <Skeleton
          height="64px"
          width="100%"
        />
        <Skeleton
          height="64px"
          width="100%"
        />
        <Skeleton
          height="64px"
          width="100%"
        />
      </div>

      <OnboardingStepper
        v-else-if="isFirstRun"
        :steps="onboardingSteps"
        :loading="dashboardLoading"
        @step-click="handleStepClick"
        @skip="handleSkipOnboarding"
      />

      <div
        v-else-if="!isAnalyticsReady"
        class="analytics-grid analytics-grid--skeleton"
      >
        <Skeleton
          v-for="i in 6"
          :key="i"
          class="analytics-grid__skeleton-item"
          height="180px"
          width="100%"
        />
      </div>

      <div
        v-else
        class="analytics-grid"
      >
        <!-- Section 1: Summary Strip -->
        <SummaryStrip
          class="analytics-grid__item analytics-grid__item--span-12"
          :loading="dashboardLoading"
          :error="dashboardError"
          :metrics="summaryMetrics"
          @retry="retryDashboard"
        />

        <!-- Section 2: Two main charts -->
        <SpendingPieCard
          class="analytics-grid__item analytics-grid__item--span-6"
          :loading="dashboardLoading"
          :error="dashboardError"
          :chart-data="categoryChartData"
          :legend="filteredCategoryLegend"
          :currency="baseCurrency"
          :scope="selectedCategoryScope"
          :scope-options="categoryScopeOptions"
          @retry="retryDashboard"
          @update:scope="selectedCategoryScope = $event"
          @select-category="handleCategorySelect"
        />

        <SpendingBarsCard
          class="analytics-grid__item analytics-grid__item--span-6"
          :loading="dashboardLoading"
          :error="dashboardError"
          :granularity="selectedGranularity"
          :granularity-options="granularityOptions"
          :chart-data="expensesChartData"
          :empty="!expensesChartData"
          :currency="baseCurrency"
          @update:granularity="selectedGranularity = $event"
          @retry="retryDashboard"
        />

        <!-- Section 3: Health score cards -->
        <HealthScoreCard
          v-for="card in healthCards"
          :key="card.key"
          class="analytics-grid__item analytics-grid__item--span-3"
          :title="card.title"
          :icon="card.icon"
          :main-value="card.mainValue"
          :main-label="card.mainLabel"
          :secondary-value="card.secondaryValue"
          :secondary-label="card.secondaryLabel"
          :accent="card.accent"
          :tooltip="card.tooltip"
        />

        <!-- Section 4 & 5: Peak days + Category delta -->
        <PeakDaysCard
          class="analytics-grid__item analytics-grid__item--span-6"
          :loading="dashboardLoading"
          :error="dashboardError"
          :peaks="peakDays"
          :summary="peakSummary"
          @retry="retryDashboard"
          @select-peak="handlePeakSelect"
          @select-peak-summary="handlePeakSummarySelect"
        />

        <CategoryDeltaCard
          class="analytics-grid__item analytics-grid__item--span-6"
          :loading="dashboardLoading"
          :error="dashboardError"
          :period-label="selectedMonthLabel"
          :increased="categoryDelta.increased"
          :decreased="categoryDelta.decreased"
          :currency="baseCurrency"
          @retry="retryDashboard"
        />

        <!-- Section 6: Forecast -->
        <ForecastCard
          class="analytics-grid__item analytics-grid__item--span-12"
          :loading="dashboardLoading"
          :error="dashboardError"
          :forecast="forecastSummary"
          :chart-data="forecastChartData"
          :currency="baseCurrency"
          :readiness-met="isForecastAndStabilityReady"
          :readiness-message="forecastReadinessMessage"
          :observed-expense-days="analyticsReadiness.observedExpenseDays"
          :required-expense-days="analyticsReadiness.requiredExpenseDays"
          @retry="retryDashboard"
        />
      </div>
    </div>

    <EvolutionTab v-show="activeTab === 'evolution'" />
  </PageContainer>
</template>

<style scoped src="../styles/pages/analytics-page.css"></style>
