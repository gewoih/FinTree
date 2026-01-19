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
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};
