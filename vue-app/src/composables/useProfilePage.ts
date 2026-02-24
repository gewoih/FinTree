import { computed, onMounted, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import { useFinanceStore } from '../stores/finance';
import { useUserStore } from '../stores/user';
import type { SubscriptionPlan } from '../types';

export function useProfilePage() {
    const financeStore = useFinanceStore();
    const userStore = useUserStore();
    const toast = useToast();
    const router = useRouter();
    const route = useRoute();

    const { currencies, areCurrenciesLoading } = storeToRefs(financeStore);
    const {
        currentUser,
        isLoading: isUserLoading,
        isSaving: isUserSaving,
        isReadOnlyMode,
        hasActiveSubscription,
        isSubscriptionProcessing,
        subscriptionPayments,
        areSubscriptionPaymentsLoading,
    } = storeToRefs(userStore);

    const form = reactive({
        baseCurrencyCode: '',
        telegramUserId: '',
    });

    const isPaymentHistoryOpen = ref(false);

    const isLoading = computed(() => isUserLoading.value || areCurrenciesLoading.value);
    const isSaving = computed(() => isUserSaving.value);
    const isSubscriptionActive = computed(() => hasActiveSubscription.value);
    const isOwner = computed(() => currentUser.value?.isOwner === true);
    const subscriptionExpiresAtLabel = computed(() => {
        const raw = currentUser.value?.subscription?.expiresAtUtc;
        if (!raw) return null;
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return null;
        return date.toLocaleDateString('ru-RU');
    });

    const userInitials = computed(() => {
        const name = currentUser.value?.name;
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        const first = parts[0] ?? '';
        const second = parts[1];
        if (second) {
            return ((first[0] ?? '') + (second[0] ?? '')).toUpperCase();
        }
        return first.slice(0, 2).toUpperCase();
    });

    const subscriptionPlans = computed(() => {
        const monthPrice = currentUser.value?.subscription?.monthPriceRub ?? 390;
        const yearPrice = currentUser.value?.subscription?.yearPriceRub ?? 3900;

        return [
            {
                plan: 'Month' as SubscriptionPlan,
                title: '1 месяц',
                price: monthPrice,
                hint: 'Стандартная цена 390 ₽',
            },
            {
                plan: 'Year' as SubscriptionPlan,
                title: '1 год',
                price: yearPrice,
                hint: 'Стандартная цена 3 900 ₽',
            },
        ];
    });

    const formattedSubscriptionPayments = computed(() =>
        subscriptionPayments.value.map(payment => {
            const paidAt = new Date(payment.paidAtUtc);
            const periodStart = new Date(payment.subscriptionStartsAtUtc);
            const periodEnd = new Date(payment.subscriptionEndsAtUtc);

            return {
                ...payment,
                paidAtLabel: Number.isNaN(paidAt.getTime()) ? '—' : paidAt.toLocaleString('ru-RU'),
                periodLabel:
                    Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())
                        ? '—'
                        : `${periodStart.toLocaleDateString('ru-RU')} - ${periodEnd.toLocaleDateString('ru-RU')}`,
                planLabel: payment.plan === 'Year' ? '1 год' : '1 месяц',
                chargedLabel: `${Math.round(payment.chargedPriceRub)} ₽`,
                listedLabel: `${Math.round(payment.listedPriceRub)} ₽`,
                statusLabel: payment.status === 'Succeeded'
                    ? 'Успешно'
                    : payment.status === 'Failed'
                        ? 'Ошибка'
                        : payment.status === 'Refunded'
                            ? 'Возврат'
                            : 'Отменено',
            };
        })
    );

    const activeTab = ref<'profile' | 'categories'>('profile');

    const resolveTabFromHash = (hash: string) =>
        hash === '#categories' ? 'categories' : 'profile';

    const setActiveTab = (tab: 'profile' | 'categories') => {
        activeTab.value = tab;
        const nextHash = tab === 'categories' ? '#categories' : '';
        if (route.hash !== nextHash) {
            router.replace({ hash: nextHash });
        }
    };

    const currencyOptions = computed(() =>
        currencies.value.map(currency => ({
            label: `${currency.symbol} ${currency.code} · ${currency.name}`,
            value: currency.code,
        }))
    );

    function normalizeTelegramId(value: string | null | undefined): string {
        if (!value) return '';
        const trimmed = value.trim();
        if (!trimmed.length) return '';
        return trimmed.replace(/\s+/g, '');
    }

    const sanitizedFormTelegramId = computed(() => normalizeTelegramId(form.telegramUserId));
    const isTelegramIdValid = computed(() =>
        !sanitizedFormTelegramId.value || /^\d+$/.test(sanitizedFormTelegramId.value)
    );

    const hasChanges = computed(() => {
        if (!currentUser.value) return false;
        const currentCurrency = currentUser.value.baseCurrencyCode ?? '';
        const currentTelegram = currentUser.value.telegramUserId?.toString() ?? '';

        return (
            currentCurrency !== (form.baseCurrencyCode || '') ||
            currentTelegram !== sanitizedFormTelegramId.value
        );
    });

    const canSubmit = computed(() =>
        Boolean(form.baseCurrencyCode) && hasChanges.value && !isSaving.value && !isReadOnlyMode.value
    );

    function resetForm() {
        if (!currentUser.value) return;
        form.baseCurrencyCode = currentUser.value.baseCurrencyCode ?? '';
        form.telegramUserId = currentUser.value.telegramUserId?.toString() ?? '';
    }

    watch(currentUser, user => {
        if (user) {
            resetForm();
        }
    }, { immediate: true });

    watch(
        () => route.hash,
        hash => {
            activeTab.value = resolveTabFromHash(hash);
        },
        { immediate: true }
    );

    onMounted(async () => {
        await Promise.all([
            financeStore.fetchCurrencies(),
            financeStore.fetchCategories(),
            userStore.fetchCurrentUser(),
        ]);
        await userStore.fetchSubscriptionPayments();

        if (currentUser.value) {
            resetForm();
        }
    });

    async function handleSubmit() {
        if (isReadOnlyMode.value) {
            toast.add({
                severity: 'warn',
                summary: 'Режим просмотра',
                detail: 'Изменение профиля доступно только при активной подписке.',
                life: 3000,
            });
            return;
        }

        if (!form.baseCurrencyCode) {
            toast.add({
                severity: 'warn',
                summary: 'Выберите валюту',
                detail: 'Выберите базовую валюту перед обновлением профиля.',
                life: 2500,
            });
            return;
        }

        if (!isTelegramIdValid.value) {
            toast.add({
                severity: 'warn',
                summary: 'Некорректный Telegram ID',
                detail: 'Введите только цифры или оставьте поле пустым.',
                life: 3000,
            });
            return;
        }

        const parsedTelegramId = sanitizedFormTelegramId.value
            ? Number(sanitizedFormTelegramId.value)
            : null;

        const success = await userStore.saveProfileSettings({
            baseCurrencyCode: form.baseCurrencyCode,
            telegramUserId: parsedTelegramId,
        });

        if (success) {
            toast.add({
                severity: 'success',
                summary: 'Профиль обновлен',
                detail: 'Ваши изменения применены.',
                life: 2500,
            });
            resetForm();
        } else {
            toast.add({
                severity: 'error',
                summary: 'Ошибка сохранения',
                detail: 'Не удалось обновить профиль. Пожалуйста, попробуйте еще раз.',
                life: 3000,
            });
        }
    }

    function handleClearTelegram() {
        form.telegramUserId = '';
    }

    async function handlePay(plan: SubscriptionPlan) {
        const success = await userStore.simulateSubscriptionPayment(plan);
        if (success) {
            toast.add({
                severity: 'success',
                summary: 'Подписка активирована',
                detail: 'Оплата имитирована успешно. Выдан бесплатный доступ на 1 месяц.',
                life: 3500,
            });
            return;
        }

        toast.add({
            severity: 'error',
            summary: 'Не удалось активировать подписку',
            detail: 'Пожалуйста, попробуйте еще раз.',
            life: 3000,
        });
    }

    function goToAdminPanel() {
        void router.push('/admin');
    }

    return {
        activeTab,
        areSubscriptionPaymentsLoading,
        canSubmit,
        currentUser,
        currencyOptions,
        form,
        formattedSubscriptionPayments,
        hasChanges,
        isLoading,
        isPaymentHistoryOpen,
        isReadOnlyMode,
        isSaving,
        isSubscriptionActive,
        isSubscriptionProcessing,
        isOwner,
        subscriptionExpiresAtLabel,
        subscriptionPlans,
        userInitials,
        goToAdminPanel,
        handleClearTelegram,
        handlePay,
        handleSubmit,
        resetForm,
        setActiveTab,
    };
}
