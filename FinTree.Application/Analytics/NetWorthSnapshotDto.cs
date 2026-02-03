namespace FinTree.Application.Analytics;

public sealed record NetWorthSnapshotDto(
    int Year,
    int Month,
    decimal NetWorth);
