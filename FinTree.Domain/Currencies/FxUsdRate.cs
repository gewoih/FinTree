using FinTree.Domain.Base;

namespace FinTree.Domain.Currencies;

public sealed class FxUsdRate : Entity
{
    public Guid CurrencyId { get; private set; }
    public DateTime EffectiveDate { get; private set; }
    public decimal Rate { get; private set; }
}