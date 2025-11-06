using FinTree.Application.Users;
using FinTree.Domain.IncomeStreams;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.IncomeInstruments;

public sealed class IncomeInstrumentsService(AppDbContext context, ICurrentUser currentUser)
{
    public async Task<IReadOnlyList<IncomeInstrumentDto>> GetAsync(CancellationToken ct = default)
    {
        var userId = currentUser.Id;

        var items = await context.IncomeInstruments
            .AsNoTracking()
            .Where(i => i.UserId == userId)
            .OrderBy(i => i.CreatedAt)
            .Select(i => new IncomeInstrumentDto(
                Id: i.Id,
                Name: i.Name,
                CurrencyCode: i.CurrencyCode,
                Type: i.InstrumentType,
                PrincipalAmount: i.PrincipalAmount,
                ExpectedAnnualYieldRate: i.ExpectedAnnualYieldRate,
                MonthlyContribution: i.MonthlyContribution,
                Notes: i.Notes,
                CreatedAt: i.CreatedAt))
            .ToListAsync(ct);

        return items;
    }

    public async Task<Guid> CreateAsync(CreateIncomeInstrument command, CancellationToken ct = default)
    {
        var user = await context.Users
            .Include(u => u.IncomeInstruments)
            .FirstOrDefaultAsync(u => u.Id == currentUser.Id, ct)
            ?? throw new InvalidOperationException("Пользователь не найден");

        var instrument = user.AddIncomeInstrument(
            name: command.Name,
            currencyCode: command.CurrencyCode,
            type: command.Type,
            principalAmount: command.PrincipalAmount,
            expectedAnnualYieldRate: command.ExpectedAnnualYieldRate,
            monthlyContribution: command.MonthlyContribution,
            notes: command.Notes);

        await context.SaveChangesAsync(ct);

        return instrument.Id;
    }
}
