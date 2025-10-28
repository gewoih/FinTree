using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class dev6 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Accounts_Currencies_CurrencyId",
                table: "Accounts");

            migrationBuilder.DropForeignKey(
                name: "FK_FxUsdRates_Currencies_CurrencyId",
                table: "FxUsdRates");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Currencies_BaseCurrencyId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Currencies");

            migrationBuilder.DropIndex(
                name: "IX_Users_BaseCurrencyId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_FxUsdRates_CurrencyId",
                table: "FxUsdRates");

            migrationBuilder.DropIndex(
                name: "IX_Accounts_CurrencyId",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "BaseCurrencyId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CurrencyId",
                table: "Accounts");

            migrationBuilder.RenameColumn(
                name: "Amount",
                table: "Transactions",
                newName: "Money_Amount");

            migrationBuilder.AddColumn<string>(
                name: "BaseCurrencyCode",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Money_Currency_Code",
                table: "Transactions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Money_Currency_Name",
                table: "Transactions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Money_Currency_Symbol",
                table: "Transactions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Money_Currency_Type",
                table: "Transactions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "Accounts",
                type: "character varying(3)",
                maxLength: 3,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BaseCurrencyCode",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Money_Currency_Code",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Money_Currency_Name",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Money_Currency_Symbol",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Money_Currency_Type",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "Accounts");

            migrationBuilder.RenameColumn(
                name: "Money_Amount",
                table: "Transactions",
                newName: "Amount");

            migrationBuilder.AddColumn<Guid>(
                name: "BaseCurrencyId",
                table: "Users",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "CurrencyId",
                table: "Accounts",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "Currencies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Symbol = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Currencies", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_BaseCurrencyId",
                table: "Users",
                column: "BaseCurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_FxUsdRates_CurrencyId",
                table: "FxUsdRates",
                column: "CurrencyId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_CurrencyId",
                table: "Accounts",
                column: "CurrencyId");

            migrationBuilder.AddForeignKey(
                name: "FK_Accounts_Currencies_CurrencyId",
                table: "Accounts",
                column: "CurrencyId",
                principalTable: "Currencies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FxUsdRates_Currencies_CurrencyId",
                table: "FxUsdRates",
                column: "CurrencyId",
                principalTable: "Currencies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Currencies_BaseCurrencyId",
                table: "Users",
                column: "BaseCurrencyId",
                principalTable: "Currencies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
