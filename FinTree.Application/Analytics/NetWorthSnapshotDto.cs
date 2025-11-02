namespace FinTree.Application.Analytics;

public readonly record struct NetWorthSnapshotDto(
    int Year,
    int Month,
    decimal TotalBalance);
