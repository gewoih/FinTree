using FinTree.Domain.Base;

namespace FinTree.Domain.Currencies;

public sealed class Currency : Entity
{
    private readonly  List<FxUsdRate> _rates = [];
    
    public string Code { get; private set; }
    public string Name { get; private set; }
    public string Symbol { get; private set; }
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