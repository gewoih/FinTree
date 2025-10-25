using FinTree.Application.Accounts;
using FinTree.Application.Exceptions;
using FinTree.Application.Transactions;
using FinTree.Application.Transactions.Dto;
using FinTree.Domain.Identity;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Users;

public sealed class UserService(AppDbContext context)
{
    public async Task UpdateBaseCurrency(Guid userId, Guid currencyId, CancellationToken ct)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            throw new NotFoundException(nameof(User), userId);
        
        user.SetBaseCurrency(currencyId);
        await context.SaveChangesAsync(ct);
    }
    
    public async Task MarkAsMainAsync(UpdateMainAccount command, CancellationToken ct = default)
    {
        var user = await context.Users
            .Include(u => u.Accounts)
            .SingleOrDefaultAsync(x => x.Id == command.UserId, ct);
        
        if (user is null)
            throw new NotFoundException(nameof(User), command.AccountId);
        
        user.SetMainAccount(command.AccountId);
        await context.SaveChangesAsync(ct);
    }
    
    public async Task<List<TransactionCategoryDto>> GetUserCategoriesAsync(Guid userId, CancellationToken ct)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty, nameof(userId));
        
        var categories = await context.TransactionCategories
            .Where(tc => tc.UserId == userId || tc.UserId == null)
            .Select(tc => new TransactionCategoryDto(tc.Id, tc.Name, tc.Color, tc.IsSystem))
            .ToListAsync(ct);
        
        return categories;
    }
}