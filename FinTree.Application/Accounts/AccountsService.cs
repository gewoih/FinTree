using FinTree.Application.Exceptions;
using FinTree.Domain.Identity;
using FinTree.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Accounts;

public sealed class AccountsService(AppDbContext context)
{
    public async Task<Guid> CreateAsync(CreateAccount command, CancellationToken ct = default)
    {
        var user = await context.Users.SingleOrDefaultAsync(x => x.Id == command.UserId, ct);
        if (user is null)
            throw new NotFoundException(nameof(User), command.UserId);
        
        var account = user.AddAccount(command.CurrencyId, command.Type, command.Name);
        await context.SaveChangesAsync(ct);
        
        return account.Id;
    }

    public async Task MarkAsMainAsync(Guid accountId, CancellationToken ct = default)
    {
        var user = await context.Users
            .Include(u => u.Accounts)
            .SingleOrDefaultAsync(x => x.Id == accountId, ct);
        
        if (user is null)
            throw new NotFoundException(nameof(User), accountId);
        
        user.SetMainAccount(accountId);
        await context.SaveChangesAsync(ct);
    }
}