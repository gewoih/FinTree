using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using FinTree.Domain.Currencies;
using FinTree.Domain.Identity;
using FinTree.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace FinTree.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<TransactionCategory> TransactionCategories { get; }
    DbSet<Account> Accounts { get; }
    DbSet<AccountBalanceAdjustment> AccountBalanceAdjustments { get; }
    DbSet<Transaction> Transactions { get; }
    DbSet<FxUsdRate> FxUsdRates { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}
