using FinTree.Domain.IncomeStreams;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FinTree.Infrastructure.Database.Configurations;

public sealed class IncomeInstrumentConfiguration : IEntityTypeConfiguration<IncomeInstrument>
{
    public void Configure(EntityTypeBuilder<IncomeInstrument> builder)
    {
        builder.ToTable("IncomeInstruments");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Name)
            .IsRequired()
            .HasMaxLength(120);

        builder.Property(i => i.CurrencyCode)
            .IsRequired()
            .HasMaxLength(3);

        builder.Property(i => i.PrincipalAmount)
            .HasColumnType("numeric(18,2)");

        builder.Property(i => i.MonthlyContribution)
            .HasColumnType("numeric(18,2)");

        builder.Property(i => i.ExpectedAnnualYieldRate)
            .HasColumnType("numeric(6,4)");

        builder.Property(i => i.Notes)
            .HasMaxLength(500);

        builder.HasOne(i => i.User)
            .WithMany(u => u.IncomeInstruments)
            .HasForeignKey(i => i.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
