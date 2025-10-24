using FinTree.Domain.Account;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FinTree.Infrastructure;

public class AccountConfig : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.HasMany(b => b.Transactions)
            .WithOne()
            .Metadata.PrincipalToDependent?.SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}