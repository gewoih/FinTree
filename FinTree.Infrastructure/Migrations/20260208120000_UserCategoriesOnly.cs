using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinTree.Infrastructure.Migrations
{
    public partial class UserCategoriesOnly : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"CREATE EXTENSION IF NOT EXISTS ""pgcrypto"";");

            migrationBuilder.Sql(@"
                CREATE TEMP TABLE category_map (
                    user_id uuid NOT NULL,
                    system_category_id uuid NOT NULL,
                    user_category_id uuid NOT NULL
                ) ON COMMIT DROP;
            ");

            migrationBuilder.Sql(@"
                INSERT INTO category_map (user_id, system_category_id, user_category_id)
                SELECT DISTINCT ON (u.""Id"", sc.""Id"")
                    u.""Id"",
                    sc.""Id"",
                    uc.""Id""
                FROM ""AspNetUsers"" u
                JOIN ""TransactionCategories"" sc
                    ON sc.""UserId"" IS NULL AND sc.""IsDeleted"" = false
                JOIN ""TransactionCategories"" uc
                    ON uc.""UserId"" = u.""Id""
                    AND uc.""IsDeleted"" = false
                    AND uc.""Name"" = sc.""Name""
                    AND uc.""Type"" = sc.""Type""
                ORDER BY u.""Id"", sc.""Id"", uc.""Id"";
            ");

            migrationBuilder.Sql(@"
                WITH missing AS (
                    SELECT
                        u.""Id"" AS user_id,
                        sc.""Id"" AS system_category_id,
                        sc.""Name"",
                        sc.""Color"",
                        sc.""Icon"",
                        sc.""Type"",
                        sc.""IsDefault"",
                        sc.""IsMandatory""
                    FROM ""AspNetUsers"" u
                    JOIN ""TransactionCategories"" sc
                        ON sc.""UserId"" IS NULL AND sc.""IsDeleted"" = false
                    LEFT JOIN category_map cm
                        ON cm.user_id = u.""Id"" AND cm.system_category_id = sc.""Id""
                    WHERE cm.system_category_id IS NULL
                ),
                inserted AS (
                    INSERT INTO ""TransactionCategories"" (
                        ""Id"",
                        ""Name"",
                        ""Color"",
                        ""Icon"",
                        ""Type"",
                        ""IsDefault"",
                        ""IsMandatory"",
                        ""UserId"",
                        ""CreatedAt"",
                        ""UpdatedAt"",
                        ""DeletedAt"",
                        ""IsDeleted""
                    )
                    SELECT
                        gen_random_uuid(),
                        m.""Name"",
                        m.""Color"",
                        m.""Icon"",
                        m.""Type"",
                        m.""IsDefault"",
                        m.""IsMandatory"",
                        m.user_id,
                        NOW(),
                        NULL,
                        NULL,
                        FALSE
                    FROM missing m
                    RETURNING ""Id"", ""UserId"", ""Name"", ""Type""
                )
                INSERT INTO category_map (user_id, system_category_id, user_category_id)
                SELECT ins.""UserId"", sc.""Id"", ins.""Id""
                FROM inserted ins
                JOIN ""TransactionCategories"" sc
                    ON sc.""UserId"" IS NULL
                    AND sc.""IsDeleted"" = false
                    AND sc.""Name"" = ins.""Name""
                    AND sc.""Type"" = ins.""Type"";
            ");

            migrationBuilder.Sql(@"
                UPDATE ""Transactions"" t
                SET ""CategoryId"" = cm.user_category_id
                FROM ""Accounts"" a
                JOIN category_map cm
                    ON cm.user_id = a.""UserId""
                WHERE t.""AccountId"" = a.""Id""
                  AND cm.system_category_id = t.""CategoryId"";
            ");

            migrationBuilder.Sql(@"
                DO $$
                DECLARE
                    fallback_user_id uuid;
                BEGIN
                    SELECT ""Id"" INTO fallback_user_id
                    FROM ""AspNetUsers""
                    ORDER BY ""Id""
                    LIMIT 1;

                    IF fallback_user_id IS NULL THEN
                        fallback_user_id := gen_random_uuid();
                        INSERT INTO ""AspNetUsers"" (
                            ""Id"",
                            ""BaseCurrencyCode"",
                            ""AccessFailedCount"",
                            ""EmailConfirmed"",
                            ""LockoutEnabled"",
                            ""PhoneNumberConfirmed"",
                            ""TwoFactorEnabled""
                        )
                        VALUES (
                            fallback_user_id,
                            'RUB',
                            0,
                            FALSE,
                            FALSE,
                            FALSE,
                            FALSE
                        );
                    END IF;

                    UPDATE ""TransactionCategories""
                    SET ""UserId"" = fallback_user_id,
                        ""IsDeleted"" = TRUE,
                        ""DeletedAt"" = NOW()
                    WHERE ""UserId"" IS NULL;
                END $$;
            ");

            migrationBuilder.DropForeignKey(
                name: "FK_TransactionCategories_AspNetUsers_UserId",
                table: "TransactionCategories");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "TransactionCategories",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_TransactionCategories_AspNetUsers_UserId",
                table: "TransactionCategories",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TransactionCategories_AspNetUsers_UserId",
                table: "TransactionCategories");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "TransactionCategories",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddForeignKey(
                name: "FK_TransactionCategories_AspNetUsers_UserId",
                table: "TransactionCategories",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }
    }
}
