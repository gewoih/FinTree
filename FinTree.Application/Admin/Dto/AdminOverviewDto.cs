namespace FinTree.Application.Admin.Dto;

public readonly record struct AdminOverviewDto(
    AdminKpisDto Kpis,
    IReadOnlyList<AdminUserSnapshotDto> Users
);
