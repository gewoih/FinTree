using System.Globalization;

namespace FinTree.Application.Telegram;

/// <summary>
/// Совет «сколько и куда отложить» для ответа бота после записи зарплаты.
/// План пополнения лежит в «плане на месяц» ретроспективы последней строкой вида
/// <c>[пополнения] Акции=44; Золото=56</c> (доли в процентах, сумма ровно 100).
/// </summary>
internal static class SalaryAdvice
{
    private const string PlanMarker = "[пополнения]";

    // Меньше этой суммы к откладыванию в тысячах получится «0 тыс.» — такой совет бесполезен.
    private const decimal MinAmountToSave = 1000m;

    internal sealed record Settings(Guid UserId, decimal SaveRate, string Category);

    internal sealed record SplitItem(string Name, int Percent);

    internal static Settings? ParseSettings(SalaryAdviceOptions options)
    {
        if (!Guid.TryParse(options.UserId, out var userId))
            return null;

        if (!decimal.TryParse(options.SaveRate, NumberStyles.Number, CultureInfo.InvariantCulture, out var saveRate)
            || saveRate <= 0m
            || saveRate > 1m)
        {
            return null;
        }

        var category = options.Category?.Trim();
        return string.IsNullOrEmpty(category) ? null : new Settings(userId, saveRate, category);
    }

    /// <summary>Доли пополнения из последней строки с маркером; null, если строки нет, она испорчена или сумма не 100.</summary>
    internal static IReadOnlyList<SplitItem>? ParseSplit(string? plan)
    {
        if (string.IsNullOrWhiteSpace(plan))
            return null;

        var line = plan.Split('\n')
            .Select(l => l.Trim())
            .LastOrDefault(l => l.StartsWith(PlanMarker, StringComparison.Ordinal));
        if (line is null)
            return null;

        var items = new List<SplitItem>();
        foreach (var part in line[PlanMarker.Length..].Split(';'))
        {
            var separator = part.LastIndexOf('=');
            if (separator < 0)
                return null;

            var name = part[..separator].Trim();
            var value = part[(separator + 1)..].Trim();
            if (name.Length == 0
                || value.Length == 0
                || !value.All(char.IsAsciiDigit)
                || !int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var percent))
            {
                return null;
            }

            items.Add(new SplitItem(name, percent));
        }

        return items.Sum(i => i.Percent) == 100 ? items : null;
    }

    /// <summary>Строка вида «📊 Отложить 76 тыс. ₽: Акции 33 · Золото 43»; null, если сумма слишком мала.</summary>
    internal static string? BuildMessage(decimal amount, string currencyCode, decimal saveRate, IReadOnlyList<SplitItem> split)
    {
        var toSave = amount * saveRate;
        if (toSave < MinAmountToSave)
            return null;

        var parts = split.Select(i => $"{i.Name} {Thousands(toSave * i.Percent / 100m)}");
        return $"📊 Отложить {Thousands(toSave)} тыс. {CurrencySign(currencyCode)}: {string.Join(" · ", parts)}";
    }

    private static string Thousands(decimal value)
        => Math.Round(value / 1000m, 0, MidpointRounding.AwayFromZero).ToString("0", CultureInfo.InvariantCulture);

    private static string CurrencySign(string currencyCode)
        => string.Equals(currencyCode, "RUB", StringComparison.OrdinalIgnoreCase) ? "₽" : currencyCode;
}
