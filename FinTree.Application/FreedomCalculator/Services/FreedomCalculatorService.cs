using FinTree.Application.Analytics.Services;
using FinTree.Application.FreedomCalculator.Dto;
using FinTree.Application.Users;

namespace FinTree.Application.FreedomCalculator.Services;

public sealed class FreedomCalculatorService(
    CashflowAverageService cashflowAverageService,
    NetWorthService netWorthService,
    UserService userService)
{
    public async Task<FreedomCalculatorDefaultsDto> GetDefaultsAsync(CancellationToken ct)
    {
        var nowUtc = DateTime.UtcNow;
        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);
        var monthlyExpenses = await cashflowAverageService.GetAverageMonthlyExpenseAsync(baseCurrencyCode, nowUtc, ct);
        var capital = await ResolveCapitalAsync(ct);
        return new FreedomCalculatorDefaultsDto(capital, monthlyExpenses);
    }

    public Task<FreedomCalculatorResultDto> CalculateAsync(FreedomCalculatorRequestDto request, CancellationToken ct)
    {
        var annualPassiveIncome = request.Capital * (request.SwrPercent / 100m);

        var effectiveMonthlyExpenses = request.InflationEnabled
            ? request.MonthlyExpenses * (1m + request.InflationRatePercent / 100m)
            : request.MonthlyExpenses;

        var annualEffectiveExpenses = effectiveMonthlyExpenses * 12m;

        if (annualEffectiveExpenses <= 0m)
            return Task.FromResult(new FreedomCalculatorResultDto(365, 100m, annualPassiveIncome, annualEffectiveExpenses));

        var ratio = annualPassiveIncome / annualEffectiveExpenses;
        var freeDays = (int)Math.Min(365, Math.Max(0, Math.Floor(ratio * 365)));
        var percentToFi = Math.Min(100m, Math.Round((decimal)freeDays / 365m * 100m, 1));

        return Task.FromResult(new FreedomCalculatorResultDto(freeDays, percentToFi, annualPassiveIncome, annualEffectiveExpenses));
    }

    private async Task<decimal> ResolveCapitalAsync(CancellationToken ct)
    {
        var snapshots = await netWorthService.GetNetWorthTrendAsync(1, ct);
        return snapshots.LastOrDefault()?.NetWorth ?? 0m;
    }
}
