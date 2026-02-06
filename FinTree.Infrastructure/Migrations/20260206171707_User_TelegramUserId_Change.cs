using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class User_TelegramUserId_Change : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""AspNetUsers""
                ALTER COLUMN ""TelegramUserId"" TYPE bigint
                USING CASE
                    WHEN ""TelegramUserId"" ~ '^[0-9]+$' THEN ""TelegramUserId""::bigint
                    ELSE NULL
                END;
            ");
            
            migrationBuilder.AlterColumn<long>(
                name: "TelegramUserId",
                table: "AspNetUsers",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "TelegramUserId",
                table: "AspNetUsers",
                type: "text",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);
        }
    }
}
