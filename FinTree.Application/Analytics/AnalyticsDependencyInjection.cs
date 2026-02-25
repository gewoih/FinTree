using Microsoft.Extensions.DependencyInjection;

namespace FinTree.Application.Analytics;

public static class AnalyticsDependencyInjection
{
    public static IServiceCollection AddAnalyticsServices(this IServiceCollection services)
    {
        services.AddScoped<IDashboardAnalyticsCalculator, DashboardAnalyticsCalculator>();
        services.AddScoped<INetWorthTrendAnalyticsCalculator, NetWorthTrendAnalyticsCalculator>();
        services.AddScoped<IEvolutionAnalyticsCalculator, EvolutionAnalyticsCalculator>();
        services.AddScoped<AnalyticsService>();

        return services;
    }
}
