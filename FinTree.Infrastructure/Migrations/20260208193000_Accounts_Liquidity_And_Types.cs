using System;
using FinTree.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260208193000_Accounts_Liquidity_And_Types")]
    public partial class Accounts_Liquidity_And_Types : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsLiquid",
                table: "Accounts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(@"UPDATE ""Accounts"" SET ""Type"" = 0 WHERE ""Type"" = 1;");
            migrationBuilder.Sql(@"UPDATE ""Accounts"" SET ""IsLiquid"" = TRUE WHERE ""Type"" = 0;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsLiquid",
                table: "Accounts");

            migrationBuilder.Sql(@"UPDATE ""Accounts"" SET ""Type"" = 1 WHERE ""Type"" = 0;");
        }
    }
}
