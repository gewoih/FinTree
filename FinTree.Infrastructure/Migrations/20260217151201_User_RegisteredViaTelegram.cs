using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class User_RegisteredViaTelegram : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RegisteredViaTelegram",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RegisteredViaTelegram",
                table: "AspNetUsers");
        }
    }
}
