using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class dev2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_FxUsdRates_CurrencyId",
                table: "FxUsdRates",
                column: "CurrencyId");

            migrationBuilder.AddForeignKey(
                name: "FK_FxUsdRates_Currencies_CurrencyId",
                table: "FxUsdRates",
                column: "CurrencyId",
                principalTable: "Currencies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FxUsdRates_Currencies_CurrencyId",
                table: "FxUsdRates");

            migrationBuilder.DropIndex(
                name: "IX_FxUsdRates_CurrencyId",
                table: "FxUsdRates");
        }
    }
}
