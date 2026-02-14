using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class User_OnboardingSkippedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "OnboardingSkippedAtUtc",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OnboardingSkippedAtUtc",
                table: "AspNetUsers");
        }
    }
}
