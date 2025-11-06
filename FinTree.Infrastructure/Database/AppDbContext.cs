using FinTree.Domain.Accounts;
using FinTree.Domain.Categories;
using FinTree.Domain.Currencies;
using FinTree.Domain.Identity;
using FinTree.Domain.IncomeStreams;
using FinTree.Domain.Transactions;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Infrastructure.Database;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<TransactionCategory> TransactionCategories => Set<TransactionCategory>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<FxUsdRate> FxUsdRates => Set<FxUsdRate>();
    public DbSet<IncomeInstrument> IncomeInstruments => Set<IncomeInstrument>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        var assemblyWithConfigurations = GetType().Assembly;
        modelBuilder.ApplyConfigurationsFromAssembly(assemblyWithConfigurations);
    }
}