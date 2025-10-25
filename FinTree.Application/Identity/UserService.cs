using FinTree.Application.Exceptions;
using FinTree.Application.Transactions.Dto;
using FinTree.Domain.Identity;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Identity;

public sealed class UserService(AppDbContext context, ICurrentUser currentUser)
{
    public async Task UpdateBaseCurrency(Guid currencyId, CancellationToken ct)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Id == currentUser.Id, ct);
        if (user == null)
            throw new NotFoundException(nameof(User), currentUser.Id);
        
        user.SetBaseCurrency(currencyId);
        await context.SaveChangesAsync(ct);
    }
    
    public async Task MarkAsMainAsync(Guid accountId, CancellationToken ct = default)
    {
        var user = await context.Users
            .Include(u => u.Accounts)
            .SingleOrDefaultAsync(x => x.Id == currentUser.Id, ct);
        
        if (user is null)
            throw new NotFoundException(nameof(User), accountId);
        
        user.SetMainAccount(accountId);
        await context.SaveChangesAsync(ct);
    }
    
    public async Task<List<TransactionCategoryDto>> GetUserCategoriesAsync(CancellationToken ct)
    {
        var userId = currentUser.Id;
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty, nameof(userId));
        
        var categories = await context.TransactionCategories
            .Where(tc => tc.UserId == userId || tc.UserId == null)
            .Select(tc => new TransactionCategoryDto(tc.Id, tc.Name, tc.Color, tc.IsSystem))
            .ToListAsync(ct);
        
        return categories;
    }
}