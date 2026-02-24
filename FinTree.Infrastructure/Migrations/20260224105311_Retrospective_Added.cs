using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Retrospective_Added : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MonthlyRetrospectives",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    MonthDate = table.Column<DateOnly>(type: "date", nullable: false),
                    BannerDismissedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Conclusion = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    NextMonthPlan = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    DisciplineRating = table.Column<int>(type: "integer", nullable: true),
                    ImpulseControlRating = table.Column<int>(type: "integer", nullable: true),
                    ConfidenceRating = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonthlyRetrospectives", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MonthlyRetrospectives_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MonthlyRetrospectives_UserId_MonthDate",
                table: "MonthlyRetrospectives",
                columns: new[] { "UserId", "MonthDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MonthlyRetrospectives");
        }
    }
}
