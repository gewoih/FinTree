import { computed, type ComputedRef, type Ref } from 'vue';
import type { Router } from 'vue-router';
import type { AnalyticsDashboardDto, AnalyticsReadinessDto, MonthlyExpenseDto } from '../types';
import type {
    CategoryDatasetMode,
    CategoryLegendItem,
    CategoryScope,
    ExpenseGranularity,
    ForecastSummary,
} from '../types/analytics';
import type { PeakDayItem } from '../types/analytics-page';
import type { useAnalyticsFormatting } from './useAnalyticsFormatting';
import type { useChartColors } from './useChartColors';
import {
    resolveStabilityAccent,
    resolveStabilityActionText,
} from '@/constants/stabilityInsight';

interface UseAnalyticsPageMetricsContext {
    analyticsReadiness: ComputedRef<AnalyticsReadinessDto>;
    chartColors: ReturnType<typeof useChartColors>['colors'];
    dashboard: Ref<AnalyticsDashboardDto | null>;
    formatting: ReturnType<typeof useAnalyticsFormatting>;
    router: Router;
    selectedCategoryMode: Ref<CategoryDatasetMode>;
    selectedCategoryScope: Ref<CategoryScope>;
    selectedGranularity: Ref<ExpenseGranularity>;
    selectedMonth: Ref<Date>;
}

export function useAnalyticsPageMetrics(context: UseAnalyticsPageMetricsContext) {
    const {
        analyticsReadiness,
        chartColors,
        dashboard,
        formatting,
        router,
        selectedCategoryMode,
        selectedCategoryScope,
        selectedGranularity,
        selectedMonth,
    } = context;

    const {
        formatPercent,
        formatPercentValue,
        formatMoney,
        formatSignedMoney,
        resolveSavingsStatus,
        resolveDiscretionaryStatus,
        resolveCushionStatus,
        getMonthRangeLocal,
        formatDateQuery,
        formatMonthLabel,
        hexToRgb,
        getIsoWeekRange,
    } = formatting;

    const summaryMetrics = computed(() => {
        const health = dashboard.value?.health;
        const netCashflow = health?.netCashflow ?? null;

        const balanceAccent: 'good' | 'poor' | 'neutral' =
            netCashflow == null ? 'neutral' : netCashflow >= 0 ? 'good' : 'poor';

        return [
            {
                key: 'income',
                label: 'Доход',
                value: formatMoney(health?.monthIncome ?? null),
                icon: 'pi pi-plus-circle',
                accent: 'income' as const,
                tooltip: 'Все доходы за выбранный месяц.',
            },
            {
                key: 'expense',
                label: 'Расходы',
                value: formatMoney(health?.monthTotal ?? null),
                icon: 'pi pi-minus-circle',
                accent: 'expense' as const,
                tooltip: 'Все расходы за выбранный месяц.',
                secondary: (() => {
                    const momChange = health?.monthOverMonthChangePercent ?? null;
                    return momChange != null
                        ? `${momChange > 0 ? '+' : ''}${momChange.toFixed(1)}% к пред. месяцу`
                        : undefined;
                })(),
            },
            {
                key: 'balance',
                label: 'Баланс месяца',
                value: formatSignedMoney(netCashflow),
                icon: 'pi pi-wallet',
                accent: balanceAccent,
                tooltip: 'Доходы минус расходы.',
            },
        ];
    });

    const healthCards = computed(() => {
        const health = dashboard.value?.health;
        const readiness = analyticsReadiness.value;
        const hasStabilityData = readiness.hasStabilityDataForSelectedMonth;
        const stabilityAction = resolveStabilityActionText(health?.stabilityActionCode ?? null);
        const stabilityTooltip = hasStabilityData
            ? 'Показывает, насколько стабильны ваши расходы за месяц. Чем выше балл, тем лучше.'
            : `Нужны расходы хотя бы в ${readiness.requiredStabilityDays} днях этого месяца. Сейчас: ${readiness.observedStabilityDaysInSelectedMonth} из ${readiness.requiredStabilityDays}.`;

        const savingsAccent = resolveSavingsStatus(
            health?.savingsRate ?? null,
            health?.monthIncome ?? null,
            health?.monthTotal ?? null
        );
        const cushionAccent = resolveCushionStatus(health?.liquidMonthsStatus ?? null);
        const stabilityAccent = hasStabilityData
            ? resolveStabilityAccent(health?.stabilityStatus ?? null)
            : 'neutral';
        const discretionaryAccent = resolveDiscretionaryStatus(health?.discretionarySharePercent ?? null);

        return [
            {
                key: 'savings',
                title: 'Сбережения',
                icon: 'pi pi-percentage',
                mainValue: health?.savingsRate == null ? '—' : formatPercent(health.savingsRate, 1),
                mainLabel: '',
                secondaryValue: formatSignedMoney(health?.netCashflow ?? null),
                secondaryLabel: 'сохранено',
                accent: savingsAccent,
                tooltip: 'Ваша сэкономленная часть от доходов.',
            },
            {
                key: 'liquidity',
                title: 'Финансовая подушка',
                icon: 'pi pi-shield',
                mainValue: health?.liquidMonths == null ? '—' : `${health.liquidMonths.toFixed(1)} мес.`,
                mainLabel: '',
                secondaryValue: formatMoney(health?.liquidAssets ?? null),
                secondaryLabel: 'сумма подушки',
                accent: cushionAccent,
                tooltip: 'На сколько месяцев жизни хватит средств из подушки безопасности.',
            },
            {
                key: 'stability',
                title: 'Стабильность трат',
                icon: 'pi pi-chart-line',
                mainValue: hasStabilityData
                    ? (health?.stabilityScore == null ? '—' : `${health.stabilityScore}/100`)
                    : 'Недостаточно данных',
                mainLabel: hasStabilityData
                    ? stabilityAction
                    : `${readiness.observedStabilityDaysInSelectedMonth} из ${readiness.requiredStabilityDays} дней с расходами`,
                accent: stabilityAccent,
                tooltip: stabilityTooltip,
            },
            {
                key: 'discretionary',
                title: 'Необязательные',
                icon: 'pi pi-shopping-bag',
                mainValue: formatPercentValue(health?.discretionarySharePercent ?? null),
                mainLabel: '',
                secondaryValue: formatMoney(health?.discretionaryTotal ?? null),
                secondaryLabel: 'сумма',
                accent: discretionaryAccent,
                tooltip: 'Ваши необязательные расходы.',
            },
        ];
    });

    function handleCategorySelect(category: CategoryLegendItem) {
        const range = getMonthRangeLocal(selectedMonth.value);
        void router.push({
            name: 'transactions',
            query: {
                categoryId: category.id,
                from: formatDateQuery(range.from),
                to: formatDateQuery(range.to),
            },
        });
    }

    function handlePeakSelect(peak: PeakDayItem) {
        void router.push({
            name: 'transactions',
            query: {
                from: formatDateQuery(peak.date),
                to: formatDateQuery(peak.date),
            },
        });
    }

    function handlePeakSummarySelect() {
        if (!peakDays.value.length) return;
        const dates = peakDays.value.map((item) => item.date.getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        void router.push({
            name: 'transactions',
            query: {
                from: formatDateQuery(minDate),
                to: formatDateQuery(maxDate),
            },
        });
    }

    const categoryLegend = computed<CategoryLegendItem[]>(() => {
        const items = selectedCategoryMode.value === 'incomes'
            ? dashboard.value?.incomeCategories?.items ?? []
            : dashboard.value?.categories.items ?? [];
        if (!items.length) return [];

        return items.map((item, index) => {
            const resolvedColor = item.color?.trim()
                || chartColors.palette[index % chartColors.palette.length]
                || chartColors.primary;

            return {
                id: item.id,
                name: item.name,
                amount: Number(item.amount ?? 0),
                mandatoryAmount: Number(item.mandatoryAmount ?? 0),
                discretionaryAmount: Number(item.discretionaryAmount ?? 0),
                percent: Number(item.percent ?? 0),
                color: resolvedColor,
                isMandatory: item.isMandatory ?? false,
            };
        });
    });

    const filteredCategoryLegend = computed<CategoryLegendItem[]>(() => {
        const scopedItems = categoryLegend.value
            .map((item) => {
                if (selectedCategoryMode.value === 'incomes') {
                    return { ...item, amount: item.amount };
                }

                const scopedAmount = selectedCategoryScope.value === 'mandatory'
                    ? item.mandatoryAmount
                    : selectedCategoryScope.value === 'discretionary'
                        ? item.discretionaryAmount
                        : item.amount;
                return { ...item, amount: scopedAmount };
            })
            .filter((item) => item.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        const total = scopedItems.reduce((sum, item) => sum + item.amount, 0);
        if (total <= 0) return scopedItems;
        return scopedItems.map((item) => ({
            ...item,
            percent: (item.amount / total) * 100,
        }));
    });

    const categoryChartData = computed(() => {
        if (!filteredCategoryLegend.value.length) return null;
        return {
            labels: filteredCategoryLegend.value.map((item) => item.name),
            datasets: [
                {
                    data: filteredCategoryLegend.value.map((item) => item.amount),
                    backgroundColor: filteredCategoryLegend.value.map((item) => item.color),
                    borderWidth: 1,
                    borderColor: chartColors.surface,
                },
            ],
        };
    });

    const categoryDelta = computed(() => {
        const delta = dashboard.value?.categories.delta;
        return {
            increased: delta?.increased ?? [],
            decreased: delta?.decreased ?? [],
        };
    });

    const peakDays = computed<PeakDayItem[]>(() => {
        const items = dashboard.value?.peakDays ?? [];
        if (!items.length) return [];
        return items.map((item) => {
            const date = new Date(item.year, item.month - 1, item.day);
            const amount = Number(item.amount ?? 0);
            return {
                label: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date),
                amount,
                amountLabel: formatMoney(amount),
                shareLabel: formatPercentValue(item.sharePercent ?? null),
                date,
            };
        });
    });

    const peakSummary = computed(() => {
        const peaks = dashboard.value?.peaks;
        if (!peaks) {
            return { count: 0, totalLabel: '—', shareLabel: '—', shareValue: null, monthLabel: '—' };
        }
        const hasMonthTotal = peaks.monthTotal != null && peaks.monthTotal > 0;
        return {
            count: peaks.count,
            totalLabel: hasMonthTotal ? formatMoney(Number(peaks.total ?? 0)) : '—',
            shareLabel: formatPercentValue(peaks.sharePercent ?? null),
            shareValue: peaks.sharePercent ?? null,
            monthLabel: hasMonthTotal ? formatMoney(Number(peaks.monthTotal ?? 0)) : '—',
        };
    });

    function getSortedExpenses(granularity: ExpenseGranularity): MonthlyExpenseDto[] {
        const items = dashboard.value?.spending?.[granularity] ?? [];
        const sorted = [...items].sort((a, b) => {
            if (granularity === 'weeks') {
                if (a.year !== b.year) return a.year - b.year;
                return (a.week ?? 0) - (b.week ?? 0);
            }
            if (a.year !== b.year) return a.year - b.year;
            if (a.month !== b.month) return a.month - b.month;
            if (granularity === 'days') return (a.day ?? 0) - (b.day ?? 0);
            return 0;
        });
        return sorted;
    }

    function formatExpenseLabel(entry: MonthlyExpenseDto, granularity: ExpenseGranularity): string {
        if (granularity === 'days' && entry.day != null) {
            return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
                .format(new Date(entry.year, entry.month - 1, entry.day));
        }
        if (granularity === 'weeks' && entry.week != null) {
            const range = getIsoWeekRange(entry.year, entry.week);
            const startLabel = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(range.start);
            const endLabel = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(range.end);
            return `${startLabel} — ${endLabel}`;
        }
        return formatMonthLabel(entry.year, entry.month);
    }

    const expensesChartData = computed(() => {
        const data = getSortedExpenses(selectedGranularity.value);
        if (!data.length) return null;
        const total = data.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
        if (total <= 0) return null;
        const labels = data.map((item) => formatExpenseLabel(item, selectedGranularity.value));
        return {
            labels,
            datasets: [
                {
                    data: data.map((item) => Number(item.amount ?? 0)),
                    backgroundColor: chartColors.expense,
                    borderRadius: 8,
                    maxBarThickness: 48,
                },
            ],
        };
    });

    const forecastSummary = computed<ForecastSummary | null>(() => {
        return dashboard.value?.forecast.summary ?? null;
    });

    const forecastChartData = computed(() => {
        const series = dashboard.value?.forecast.series;
        if (!series || !series.days.length) return null;

        const labels = series.days.map((day) => day.toString());
        const baselineValue = series.baseline ?? dashboard.value?.forecast.summary.baselineLimit ?? null;
        const hasBaseline = baselineValue != null;
        const baselineData = hasBaseline ? series.days.map(() => baselineValue) : [];

        return {
            labels,
            datasets: [
                {
                    label: 'Факт',
                    data: series.actual,
                    borderColor: chartColors.actual,
                    backgroundColor: `rgba(${hexToRgb(chartColors.actual)}, 0.14)`,
                    fill: true,
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: chartColors.actual,
                    pointBorderColor: chartColors.surface,
                    spanGaps: false,
                },
                {
                    label: 'Оптимистичный',
                    data: series.optimistic,
                    borderColor: chartColors.optimistic,
                    borderDash: [4, 6],
                    borderWidth: 1.75,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.2,
                },
                {
                    label: 'Базовый',
                    data: series.forecast,
                    borderColor: chartColors.forecast,
                    borderDash: [8, 6],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.25,
                },
                {
                    label: 'Риск',
                    data: series.risk,
                    borderColor: chartColors.risk,
                    borderDash: [10, 6],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.2,
                },
                ...(hasBaseline
                    ? [{
                        label: 'Базовые расходы',
                        data: baselineData,
                        borderColor: chartColors.baseline,
                        borderDash: [4, 4],
                        borderWidth: 1.25,
                        pointRadius: 0,
                        fill: false,
                        tension: 0,
                    }]
                    : []),
            ],
        };
    });

    return {
        categoryChartData,
        categoryDelta,
        expensesChartData,
        filteredCategoryLegend,
        forecastChartData,
        forecastSummary,
        healthCards,
        peakDays,
        peakSummary,
        summaryMetrics,
        handleCategorySelect,
        handlePeakSelect,
        handlePeakSummarySelect,
    };
}
