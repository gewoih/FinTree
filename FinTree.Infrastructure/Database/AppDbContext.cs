using FinTree.Application.Abstractions;
using FinTree.Domain.Accounts;
using FinTree.Domain.Base;
using FinTree.Domain.Categories;
using FinTree.Domain.Currencies;
using FinTree.Domain.Identity;
using FinTree.Domain.Subscriptions;
using FinTree.Domain.Transactions;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Linq.Expressions;

namespace FinTree.Infrastructure.Database;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<User, Role, Guid>(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<SubscriptionPayment> SubscriptionPayments => Set<SubscriptionPayment>();
    public DbSet<TransactionCategory> TransactionCategories => Set<TransactionCategory>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountBalanceAdjustment> AccountBalanceAdjustments => Set<AccountBalanceAdjustment>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<FxUsdRate> FxUsdRates => Set<FxUsdRate>();

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        => Database.BeginTransactionAsync(cancellationToken);
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        var assemblyWithConfigurations = GetType().Assembly;
        modelBuilder.ApplyConfigurationsFromAssembly(assemblyWithConfigurations);

        ConfigureFxUsdRates(modelBuilder);
        ConfigureRefreshTokens(modelBuilder);
        ConfigureSubscriptionPayments(modelBuilder);
        ConfigureUsers(modelBuilder);
        ApplySoftDeleteQueryFilters(modelBuilder);
    }

    private static void ConfigureFxUsdRates(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FxUsdRate>(entity =>
        {
            entity.Property(x => x.CurrencyCode).HasMaxLength(5);
            entity.HasIndex(x => new { x.CurrencyCode, x.EffectiveDate }).IsUnique();
        });
    }

    private static void ConfigureRefreshTokens(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.Property(x => x.TokenHash).HasMaxLength(64);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.ExpiresAt });
        });
    }

    private static void ConfigureSubscriptionPayments(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SubscriptionPayment>(entity =>
        {
            entity.Property(x => x.Provider).HasMaxLength(50);
            entity.Property(x => x.ExternalPaymentId).HasMaxLength(120);
            entity.Property(x => x.MetadataJson).HasMaxLength(4000);
            entity.Property(x => x.ListedPriceRub).HasPrecision(18, 2);
            entity.Property(x => x.ChargedPriceRub).HasPrecision(18, 2);

            entity.HasIndex(x => new { x.UserId, x.PaidAtUtc });
            entity.HasIndex(x => new { x.UserId, x.Status });
            entity.HasIndex(x => x.ExternalPaymentId)
                .IsUnique()
                .HasFilter("\"ExternalPaymentId\" IS NOT NULL");

            entity.HasOne(x => x.User)
                .WithMany(u => u.SubscriptionPayments)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureUsers(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(x => x.TelegramUserId)
                .HasDatabaseName("IX_AspNetUsers_TelegramUserId")
                .IsUnique()
                .HasFilter("\"TelegramUserId\" IS NOT NULL");
        });
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
