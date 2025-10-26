using System.ComponentModel.DataAnnotations;

namespace FinTree.Domain.Currencies;

public sealed class Currency
{
    private readonly List<FxUsdRate> _rates = [];

    public Guid Id { get; private set; }
    [MaxLength(3)] public string Code { get; private set; }
    [MaxLength(50)] public string Name { get; private set; }
    [MaxLength(10)] public string Symbol { get; private set; }
    public CurrencyType Type { get; private set; }
    public IReadOnlyCollection<FxUsdRate> UsdRates => _rates;

    public Currency(string code, string name, string symbol, CurrencyType type)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(code, nameof(code));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ArgumentException.ThrowIfNullOrWhiteSpace(symbol, nameof(symbol));

        Code = code;
        Name = name;
        Symbol = symbol;
        Type = type;
    }
}