// using FinTree.Domain.Identity;
// using Microsoft.EntityFrameworkCore;
// using Microsoft.EntityFrameworkCore.Metadata.Builders;
//
// namespace FinTree.Infrastructure.Configs;
//
// public class UserConfig : IEntityTypeConfiguration<User>
// {
//     public void Configure(EntityTypeBuilder<User> builder)
//     {
//         builder.HasMany(b => b.Accounts)
//             .WithOne()
//             .Metadata.PrincipalToDependent?.SetPropertyAccessMode(PropertyAccessMode.Field);
//         
//         builder.HasMany(b => b.TransactionCategories)
//             .WithOne()
//             .Metadata.PrincipalToDependent?.SetPropertyAccessMode(PropertyAccessMode.Field);
//     }
// }