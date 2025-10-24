using FinTree.Domain.Base;

namespace FinTree.Domain.Currency;

public sealed class FxUsdRate : Entity
{
    public Guid CurrencyId { get; set; }
    public DateTime EffectiveDate { get; set; }
    public decimal Rate { get; set; }
}