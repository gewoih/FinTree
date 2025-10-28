using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class dev7 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
        }
    }
}
