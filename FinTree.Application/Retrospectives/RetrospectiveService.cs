using System.Globalization;
using System.Text.RegularExpressions;
using FinTree.Application.Abstractions;
using FinTree.Application.Exceptions;
using FinTree.Application.Users;
using FinTree.Domain.Retrospectives;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Retrospectives;

public sealed partial class RetrospectiveService(IAppDbContext context, ICurrentUser currentUser)
{
    public async Task<List<string>> GetAvailableMonthsAsync(CancellationToken ct)
    {
        var userId = currentUser.Id;
        var now = DateTime.UtcNow;
        var currentYear = now.Year;
        var currentMonth = now.Month;

        var months = await context.Transactions
            .AsNoTracking()
            .Where(t => t.Account.UserId == userId)
            .Where(t =>
                t.OccurredAt.Year < currentYear ||
                (t.OccurredAt.Year == currentYear && t.OccurredAt.Month < currentMonth))
            .Select(t => new { t.OccurredAt.Year, t.OccurredAt.Month })
            .Distinct()
            .OrderByDescending(item => item.Year)
            .ThenByDescending(item => item.Month)
            .ToListAsync(ct);

        return months
            .Select(item => FormatMonth(new DateOnly(item.Year, item.Month, 1)))
            .ToList();
    }

    public async Task<List<RetrospectiveListItemDto>> GetListAsync(CancellationToken ct)
    {
        var userId = currentUser.Id;

        var items = await context.Retrospectives
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .Where(r =>
                r.Conclusion != null ||
                r.NextMonthPlan != null ||
                r.Wins != null ||
                r.SavingsOpportunities != null ||
                r.DisciplineRating != null ||
                r.ImpulseControlRating != null ||
                r.ConfidenceRating != null)
            .OrderByDescending(r => r.MonthDate)
            .ToListAsync(ct);

        return items
            .Select(r => new RetrospectiveListItemDto(
                FormatMonth(r.MonthDate),
                r.DisciplineRating,
                r.ImpulseControlRating,
                r.ConfidenceRating,
                BuildPreview(r.Conclusion),
                BuildPreview(r.Wins),
                HasMeaningfulContent(r)))
            .ToList();
    }

    public async Task<RetrospectiveDto?> GetByMonthAsync(string month, CancellationToken ct)
    {
        var monthDate = ParseMonth(month);

        var userId = currentUser.Id;
        var entity = await context.Retrospectives
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.UserId == userId && r.MonthDate == monthDate, ct);

        return entity is null ? null : Map(entity);
    }

    public async Task<RetrospectiveDto> UpsertAsync(UpsertRetrospectiveCommand command, CancellationToken ct)
    {
        var monthDate = ParseMonth(command.Month);
        EnsurePastMonth(monthDate);
        ValidateRatings(command.DisciplineRating, command.ImpulseControlRating, command.ConfidenceRating);

        if (!HasMeaningfulContent(command))
            throw new DomainValidationException("Заполните хотя бы один показатель или текст рефлексии.");

        var userId = currentUser.Id;
        var entity = await context.Retrospectives
            .FirstOrDefaultAsync(r => r.UserId == userId && r.MonthDate == monthDate, ct);

        if (entity is null)
        {
            entity = MonthlyRetrospective.Create(userId, monthDate);
            context.Retrospectives.Add(entity);
        }

        entity.Update(
            command.Conclusion,
            command.NextMonthPlan,
            command.Wins,
            command.SavingsOpportunities,
            command.DisciplineRating,
            command.ImpulseControlRating,
            command.ConfidenceRating);

        await context.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task DismissBannerAsync(string month, CancellationToken ct)
    {
        var monthDate = ParseMonth(month);

        var userId = currentUser.Id;
        var entity = await context.Retrospectives
            .FirstOrDefaultAsync(r => r.UserId == userId && r.MonthDate == monthDate, ct);

        if (entity is null)
        {
            entity = MonthlyRetrospective.Create(userId, monthDate);
            entity.DismissBanner();
            context.Retrospectives.Add(entity);
        }
        else
        {
            entity.DismissBanner();
        }

        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(string month, CancellationToken ct)
    {
        var monthDate = ParseMonth(month);

        var userId = currentUser.Id;
        var entity = await context.Retrospectives
            .FirstOrDefaultAsync(r => r.UserId == userId && r.MonthDate == monthDate, ct);

        if (entity is null)
            throw new NotFoundException(nameof(MonthlyRetrospective), month);

        entity.Delete();
        await context.SaveChangesAsync(ct);
    }

    public async Task<bool> HasRetrospectiveOrDismissalAsync(string month, CancellationToken ct)
    {
        var monthDate = ParseMonth(month);

        var userId = currentUser.Id;
        return await context.Retrospectives
            .AnyAsync(r => r.UserId == userId && r.MonthDate == monthDate, ct);
    }

    private static RetrospectiveDto Map(MonthlyRetrospective entity) =>
        new(
            FormatMonth(entity.MonthDate),
            entity.BannerDismissedAt,
            entity.Conclusion,
            entity.NextMonthPlan,
            entity.Wins,
            entity.SavingsOpportunities,
            entity.DisciplineRating,
            entity.ImpulseControlRating,
            entity.ConfidenceRating);

    private static DateOnly ParseMonth(string month)
    {
        if (!MonthRegex().IsMatch(month))
            throw new ArgumentException("Month must be in YYYY-MM format.", nameof(month));

        var year = int.Parse(month.AsSpan(0, 4), CultureInfo.InvariantCulture);
        var monthValue = int.Parse(month.AsSpan(5, 2), CultureInfo.InvariantCulture);
        return new DateOnly(year, monthValue, 1);
    }

    private static string FormatMonth(DateOnly monthDate)
    {
        return monthDate.ToString("yyyy-MM", CultureInfo.InvariantCulture);
    }

    private static void EnsurePastMonth(DateOnly monthDate)
    {
        var now = DateTime.UtcNow;
        var currentMonthStart = new DateOnly(now.Year, now.Month, 1);

        if (monthDate >= currentMonthStart)
            throw new DomainValidationException("Рефлексию можно сохранить только за прошедший месяц.");
    }

    private static void ValidateRatings(params int?[] ratings)
    {
        foreach (var rating in ratings)
        {
            if (rating is < 1 or > 5)
                throw new ArgumentOutOfRangeException(nameof(ratings), "Rating must be between 1 and 5.");
        }
    }

    private static bool HasMeaningfulContent(UpsertRetrospectiveCommand command)
    {
        return command.DisciplineRating != null ||
               command.ImpulseControlRating != null ||
               command.ConfidenceRating != null ||
               !string.IsNullOrWhiteSpace(command.Conclusion) ||
               !string.IsNullOrWhiteSpace(command.NextMonthPlan) ||
               !string.IsNullOrWhiteSpace(command.Wins) ||
               !string.IsNullOrWhiteSpace(command.SavingsOpportunities);
    }

    private static bool HasMeaningfulContent(MonthlyRetrospective entity)
    {
        return entity.DisciplineRating != null ||
               entity.ImpulseControlRating != null ||
               entity.ConfidenceRating != null ||
               !string.IsNullOrWhiteSpace(entity.Conclusion) ||
               !string.IsNullOrWhiteSpace(entity.NextMonthPlan) ||
               !string.IsNullOrWhiteSpace(entity.Wins) ||
               !string.IsNullOrWhiteSpace(entity.SavingsOpportunities);
    }

    private static string? BuildPreview(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var trimmed = text.Trim();
        const int maxLength = 140;

        return trimmed.Length <= maxLength ? trimmed : $"{trimmed[..maxLength]}…";
    }

    [GeneratedRegex("^\\d{4}-(0[1-9]|1[0-2])$")]
    private static partial Regex MonthRegex();
}
