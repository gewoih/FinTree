namespace FinTree.Application.Admin;

public readonly record struct AdminOverviewDto(
    AdminKpisDto Kpis,
    IReadOnlyList<AdminUserSnapshotDto> Users
);
