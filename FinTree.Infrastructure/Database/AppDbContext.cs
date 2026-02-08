using FinTree.Domain.Accounts;
using FinTree.Domain.Base;
using FinTree.Domain.Categories;
using FinTree.Domain.Currencies;
using FinTree.Domain.Identity;
using FinTree.Domain.Transactions;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace FinTree.Infrastructure.Database;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<User, Role, Guid>(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<TransactionCategory> TransactionCategories => Set<TransactionCategory>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountBalanceAdjustment> AccountBalanceAdjustments => Set<AccountBalanceAdjustment>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<FxUsdRate> FxUsdRates => Set<FxUsdRate>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        var assemblyWithConfigurations = GetType().Assembly;
        modelBuilder.ApplyConfigurationsFromAssembly(assemblyWithConfigurations);

        ApplySoftDeleteQueryFilters(modelBuilder);
    }

    private static void ApplySoftDeleteQueryFilters(ModelBuilder modelBuilder)
    {
        var entityTypes = modelBuilder.Model.GetEntityTypes()
            .Where(entityType => typeof(Entity).IsAssignableFrom(entityType.ClrType));

        foreach (var entityType in entityTypes)
        {
            var parameter = Expression.Parameter(entityType.ClrType, "entity");
            var property = Expression.Property(parameter, nameof(Entity.IsDeleted));
            var filter = Expression.Lambda(Expression.Equal(property, Expression.Constant(false)), parameter);

            modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
        }
    }
}
