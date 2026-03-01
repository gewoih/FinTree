namespace FinTree.Application.Analytics.Dto;

public sealed record NetWorthSnapshotDto(
    int Year,
    int Month,
    decimal NetWorth);
