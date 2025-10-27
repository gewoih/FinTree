namespace FinTree.Application.Currencies;

public readonly record struct CurrencyDto(Guid Id, string Code, string Name, string Symbol);
