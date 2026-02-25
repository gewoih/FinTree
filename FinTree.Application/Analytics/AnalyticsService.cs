namespace FinTree.Application.Analytics;

public sealed class AnalyticsService(
    IDashboardAnalyticsCalculator dashboardCalculator,
    INetWorthTrendAnalyticsCalculator netWorthTrendCalculator,
    IEvolutionAnalyticsCalculator evolutionCalculator)
{
    public Task<AnalyticsDashboardDto> GetDashboardAsync(int year, int month, CancellationToken ct = default)
        => dashboardCalculator.GetDashboardAsync(year, month, ct);

    public Task<List<NetWorthSnapshotDto>> GetNetWorthTrendAsync(int months = 12, CancellationToken ct = default)
        => netWorthTrendCalculator.GetNetWorthTrendAsync(months, ct);

    public Task<List<EvolutionMonthDto>> GetEvolutionAsync(int months, CancellationToken ct = default)
        => evolutionCalculator.GetEvolutionAsync(months, ct);
}
