using System.ComponentModel.DataAnnotations.Schema;
using FinTree.Domain.Currencies;

namespace FinTree.Domain.ValueObjects;

[ComplexType]
public sealed record Currency
{
    private static readonly Dictionary<string, Currency> ByCode =
        new()
        {
            ["RUB"] = new Currency("RUB", "Российский рубль", "₽", CurrencyType.Fiat),
            ["USD"] = new Currency("USD", "Доллар США", "$", CurrencyType.Fiat),
            ["EUR"] = new Currency("EUR", "Евро", "€", CurrencyType.Fiat),
            ["GBP"] = new Currency("GBP", "Фунт стерлингов", "£", CurrencyType.Fiat),
            ["CHF"] = new Currency("CHF", "Швейцарский франк", "₣", CurrencyType.Fiat),
            ["JPY"] = new Currency("JPY", "Японская иена", "¥", CurrencyType.Fiat),
            ["CNY"] = new Currency("CNY", "Китайский юань", "¥", CurrencyType.Fiat),
            ["AUD"] = new Currency("AUD", "Австралийский доллар", "A$", CurrencyType.Fiat),
            ["CAD"] = new Currency("CAD", "Канадский доллар", "C$", CurrencyType.Fiat),
            ["PLN"] = new Currency("PLN", "Польский злотый", "zł", CurrencyType.Fiat),
            ["CZK"] = new Currency("CZK", "Чешская крона", "Kč", CurrencyType.Fiat),
            ["TRY"] = new Currency("TRY", "Турецкая лира", "₺", CurrencyType.Fiat),
            ["AED"] = new Currency("AED", "Дирхам ОАЭ", "د.إ", CurrencyType.Fiat),
            ["INR"] = new Currency("INR", "Индийская рупия", "₹", CurrencyType.Fiat),
            ["THB"] = new Currency("THB", "Тайский бат", "฿", CurrencyType.Fiat),
            ["KZT"] = new Currency("KZT", "Тенге", "₸", CurrencyType.Fiat),
            ["BYN"] = new Currency("BYN", "Белорусский рубль", "Br", CurrencyType.Fiat)
        };

    public string Code { get; init; }
    public string Name { get; init; }
    public string Symbol { get; init; }
    public CurrencyType Type { get; init; }
    public static IReadOnlyCollection<Currency> All => ByCode.Values;

    private Currency()
    {
    }

    private Currency(string code, string name, string symbol, CurrencyType type)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code, nameof(code));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ArgumentException.ThrowIfNullOrWhiteSpace(symbol, nameof(symbol));

        Code = code;
        Name = name;
        Symbol = symbol;
        Type = type;
    }

    public static Currency FromCode(string code)
        => ByCode.TryGetValue(code, out var c)
            ? c
            : throw new ArgumentOutOfRangeException(nameof(code), $"Неизвестный код валюты: {code}");

    public static bool TryFromCode(string code, out Currency currency)
        => ByCode.TryGetValue(code, out currency!);

    public bool Equals(Currency? other) => Code == other?.Code;
    public override int GetHashCode() => StringComparer.OrdinalIgnoreCase.GetHashCode(Code);
}
