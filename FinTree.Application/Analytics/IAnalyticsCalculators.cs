namespace FinTree.Application.Analytics;

public interface IDashboardAnalyticsCalculator
{
    Task<AnalyticsDashboardDto> GetDashboardAsync(int year, int month, CancellationToken ct);
}

public interface INetWorthTrendAnalyticsCalculator
{
    Task<List<NetWorthSnapshotDto>> GetNetWorthTrendAsync(int months, CancellationToken ct);
}

public interface IEvolutionAnalyticsCalculator
{
    Task<List<EvolutionMonthDto>> GetEvolutionAsync(int months, CancellationToken ct);
}
