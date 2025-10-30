using FinTree.Application.Exceptions;
using FinTree.Application.Users;
using FinTree.Domain.Identity;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Accounts;

public sealed class AccountsService(AppDbContext context, ICurrentUser currentUser)
{
    public async Task<List<AccountDto>> GetAccounts(CancellationToken ct = default)
    {
        var accounts = await context.Accounts
            .AsNoTracking()
            .Include(a => a.User)
            .Where(a => a.UserId == currentUser.Id)
            .Select(a => new AccountDto(a.Id, a.CurrencyCode, a.Name, a.Type, a.IsMain))
            .ToListAsync(ct);
        
        return accounts;
    }
    
    public async Task<Guid> CreateAsync(CreateAccount command, CancellationToken ct = default)
    {
        var user = await context.Users.SingleOrDefaultAsync(x => x.Id == command.UserId, ct);
        if (user is null)
            throw new NotFoundException(nameof(User), command.UserId);
        
        var account = user.AddAccount(command.CurrencyCode, command.Type, command.Name);
        await context.SaveChangesAsync(ct);
        
        return account.Id;
    }
}