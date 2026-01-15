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
            ["NZD"] = new Currency("NZD", "Новозеландский доллар", "NZ$", CurrencyType.Fiat),
            ["SEK"] = new Currency("SEK", "Шведская крона", "kr", CurrencyType.Fiat),
            ["NOK"] = new Currency("NOK", "Норвежская крона", "kr", CurrencyType.Fiat),
            ["DKK"] = new Currency("DKK", "Датская крона", "kr", CurrencyType.Fiat),
            ["PLN"] = new Currency("PLN", "Польский злотый", "zł", CurrencyType.Fiat),
            ["CZK"] = new Currency("CZK", "Чешская крона", "Kč", CurrencyType.Fiat),
            ["HUF"] = new Currency("HUF", "Венгерский форинт", "Ft", CurrencyType.Fiat),
            ["TRY"] = new Currency("TRY", "Турецкая лира", "₺", CurrencyType.Fiat),
            ["ILS"] = new Currency("ILS", "Израильский шекель", "₪", CurrencyType.Fiat),
            ["AED"] = new Currency("AED", "Дирхам ОАЭ", "د.إ", CurrencyType.Fiat),
            ["SAR"] = new Currency("SAR", "Саудовский риял", "﷼", CurrencyType.Fiat),
            ["INR"] = new Currency("INR", "Индийская рупия", "₹", CurrencyType.Fiat),
            ["SGD"] = new Currency("SGD", "Сингапурский доллар", "S$", CurrencyType.Fiat),
            ["HKD"] = new Currency("HKD", "Гонконгский доллар", "HK$", CurrencyType.Fiat),
            ["THB"] = new Currency("THB", "Тайский бат", "฿", CurrencyType.Fiat),
            ["VND"] = new Currency("VND", "Вьетнамский донг", "₫", CurrencyType.Fiat),
            ["KZT"] = new Currency("KZT", "Тенге", "₸", CurrencyType.Fiat),
            ["UAH"] = new Currency("UAH", "Украинская гривна", "₴", CurrencyType.Fiat),
            ["BYN"] = new Currency("BYN", "Белорусский рубль", "Br", CurrencyType.Fiat),
            ["BRL"] = new Currency("BRL", "Бразильский реал", "R$", CurrencyType.Fiat),
            ["MXN"] = new Currency("MXN", "Мексиканское песо", "$", CurrencyType.Fiat),
            ["ZAR"] = new Currency("ZAR", "Южноафриканский рэнд", "R", CurrencyType.Fiat),

            // --- Криптовалюты ---
            ["BTC"] = new Currency("BTC", "Биткойн", "₿", CurrencyType.Crypto),
            ["ETH"] = new Currency("ETH", "Эфириум", "Ξ", CurrencyType.Crypto),
            ["USDT"] = new Currency("USDT", "Tether (USD₮)", "₮", CurrencyType.Crypto),
            ["USDC"] = new Currency("USDC", "USD Coin", "$", CurrencyType.Crypto),
            ["BNB"] = new Currency("BNB", "Binance Coin", "BNB", CurrencyType.Crypto),
            ["SOL"] = new Currency("SOL", "Solana", "◎", CurrencyType.Crypto),
            ["XRP"] = new Currency("XRP", "Ripple", "XRP", CurrencyType.Crypto),
            ["DOGE"] = new Currency("DOGE", "Dogecoin", "Ð", CurrencyType.Crypto),
            ["TRX"] = new Currency("TRX", "TRON", "TRX", CurrencyType.Crypto),
            ["TON"] = new Currency("TON", "Toncoin", "TON", CurrencyType.Crypto),
            ["ADA"] = new Currency("ADA", "Cardano", "₳", CurrencyType.Crypto),
            ["DOT"] = new Currency("DOT", "Polkadot", "DOT", CurrencyType.Crypto),
            ["AVAX"] = new Currency("AVAX", "Avalanche", "AVAX", CurrencyType.Crypto),
            ["LTC"] = new Currency("LTC", "Litecoin", "Ł", CurrencyType.Crypto),
            ["XMR"] = new Currency("XMR", "Monero", "ɱ", CurrencyType.Crypto)
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