using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Category_Icon_Added : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "TransactionCategories",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-tag' WHERE ""Name""='Без категории' AND ""Icon""='';");

            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-shopping-cart' WHERE ""Name""='Продукты' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-coffee' WHERE ""Name""='Кафе' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-heart' WHERE ""Name""='Здоровье' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-car' WHERE ""Name""='Транспорт' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-home' WHERE ""Name""='Дом' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-star' WHERE ""Name""='Развлечения' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-refresh' WHERE ""Name""='Подписки' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-book' WHERE ""Name""='Образование' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-globe' WHERE ""Name""='Путешествия' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-gift' WHERE ""Name""='Подарки' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-credit-card' WHERE ""Name""='Платежи' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-shopping-bag' WHERE ""Name""='Одежда' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-palette' WHERE ""Name""='Хобби' AND ""Icon""='';");

            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-briefcase' WHERE ""Name""='Зарплата' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-desktop' WHERE ""Name""='Фриланс' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-chart-line' WHERE ""Name""='Инвестиции' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-percentage' WHERE ""Name""='Кэшбэк' AND ""Icon""='';");
            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-building' WHERE ""Name""='Бизнес' AND ""Icon""='';");

            migrationBuilder.Sql(
                @"UPDATE ""TransactionCategories"" SET ""Icon""='pi-tag' WHERE ""Icon""='';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Icon",
                table: "TransactionCategories");
        }
    }
}
