using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class dev8 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "FxUsdRates");

            migrationBuilder.DropColumn(
                name: "CurrencyId",
                table: "FxUsdRates");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "FxUsdRates");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "FxUsdRates");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "FxUsdRates");

            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "FxUsdRates",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "FxUsdRates");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "FxUsdRates",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "CurrencyId",
                table: "FxUsdRates",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "FxUsdRates",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "FxUsdRates",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "FxUsdRates",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
