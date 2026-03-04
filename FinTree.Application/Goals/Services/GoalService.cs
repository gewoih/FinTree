using FinTree.Application.Abstractions;
using FinTree.Application.Exceptions;
using FinTree.Application.Goals.Dto;
using FinTree.Application.Users;
using FinTree.Domain.Goals;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Goals.Services;

public sealed class GoalService(IAppDbContext context, ICurrentUser currentUser)
{
    public async Task<List<GoalDto>> GetAllAsync(CancellationToken ct = default)
    {
        var userId = currentUser.Id;

        return await context.Goals
            .AsNoTracking()
            .Where(g => g.UserId == userId)
            .OrderBy(g => g.CreatedAt)
            .Select(g => new GoalDto(
                g.Id,
                g.Name,
                g.TargetAmount,
                g.CurrencyCode,
                g.ParameterOverridesJson,
                g.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<GoalDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var userId = currentUser.Id;

        return await context.Goals
            .AsNoTracking()
            .Where(g => g.Id == id && g.UserId == userId)
            .Select(g => new GoalDto(
                g.Id,
                g.Name,
                g.TargetAmount,
                g.CurrencyCode,
                g.ParameterOverridesJson,
                g.CreatedAt))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(Goal), id);
    }

    public async Task<GoalDto> CreateAsync(CreateGoalDto dto, CancellationToken ct = default)
    {
        var userId = currentUser.Id;
        var goal = Goal.Create(userId, dto.Name, dto.TargetAmount, dto.CurrencyCode);

        context.Goals.Add(goal);
        await context.SaveChangesAsync(ct);

        return new GoalDto(
            goal.Id,
            goal.Name,
            goal.TargetAmount,
            goal.CurrencyCode,
            goal.ParameterOverridesJson,
            goal.CreatedAt);
    }

    public async Task<GoalDto> UpdateAsync(Guid id, UpdateGoalDto dto, CancellationToken ct = default)
    {
        var userId = currentUser.Id;

        var goal = await context.Goals
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct)
            ?? throw new NotFoundException(nameof(Goal), id);

        goal.UpdateDetails(dto.Name, dto.TargetAmount, dto.ParameterOverridesJson);
        await context.SaveChangesAsync(ct);

        return new GoalDto(
            goal.Id,
            goal.Name,
            goal.TargetAmount,
            goal.CurrencyCode,
            goal.ParameterOverridesJson,
            goal.CreatedAt);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = currentUser.Id;

        var goal = await context.Goals
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId, ct)
            ?? throw new NotFoundException(nameof(Goal), id);

        goal.Delete();
        await context.SaveChangesAsync(ct);
    }
}
