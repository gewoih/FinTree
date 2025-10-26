export const formatCurrency = (amount: number, currency: string = 'KZT'): string => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
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
