using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Currencies;

public sealed class CurrenciesService(AppDbContext context)
{
    public async Task<List<CurrencyDto>> GetCurrenciesAsync(CancellationToken ct)
    {
        var currencies = await context.Currencies
            .AsNoTracking()
            .Select(c => new CurrencyDto(c.Id, c.Code, c.Name, c.Symbol))
            .ToListAsync(ct);
        
        return currencies;
    }
}