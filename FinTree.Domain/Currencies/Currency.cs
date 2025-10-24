using FinTree.Domain.Base;

namespace FinTree.Domain.Currencies;

public sealed class Currency : Entity
{
    public required string Code { get; set; }
    public required string Name { get; set; }
    public required string Symbol { get; set; }
    public CurrencyType Type { get; set; }
}