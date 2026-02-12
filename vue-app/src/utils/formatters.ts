export const formatCurrency = (
    amount: number,
    currency?: string | null,
    locale: string = 'ru-RU'
): string => {
    if (!currency || typeof currency !== 'string') {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }

    const normalizedCurrency = currency.toUpperCase();

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: normalizedCurrency,
            minimumFractionDigits: 2,
        }).format(amount);
    } catch {
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }
};

export const formatDate = (dateString?: string): string => {
    if (!dateString) {
        return '—';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    const isUtcMidnight =
        /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.\d+)?(?:Z|\+00:00)$/i.test(dateString);

    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(isUtcMidnight ? { timeZone: 'UTC' } : {}),
    });
};
