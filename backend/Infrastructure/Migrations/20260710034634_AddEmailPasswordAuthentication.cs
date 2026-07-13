using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailPasswordAuthentication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_passport_accounts_provider_uid",
                table: "passport_accounts");

            migrationBuilder.AlterColumn<string>(
                name: "oauth_user_id",
                table: "passport_accounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "oauth_provider",
                table: "passport_accounts",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "email_verification_token",
                table: "passport_accounts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "email_verification_token_expires_at",
                table: "passport_accounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "full_name",
                table: "passport_accounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_email_verified",
                table: "passport_accounts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_login_at",
                table: "passport_accounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "password_hash",
                table: "passport_accounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "password_reset_token",
                table: "passport_accounts",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "password_reset_token_expires_at",
                table: "passport_accounts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_passport_accounts_email",
                table: "passport_accounts",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_passport_accounts_email_verification_token",
                table: "passport_accounts",
                column: "email_verification_token");

            migrationBuilder.CreateIndex(
                name: "idx_passport_accounts_password_reset_token",
                table: "passport_accounts",
                column: "password_reset_token");

            migrationBuilder.CreateIndex(
                name: "idx_passport_accounts_provider_uid",
                table: "passport_accounts",
                columns: new[] { "oauth_provider", "oauth_user_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_passport_accounts_email",
                table: "passport_accounts");

            migrationBuilder.DropIndex(
                name: "idx_passport_accounts_email_verification_token",
                table: "passport_accounts");

            migrationBuilder.DropIndex(
                name: "idx_passport_accounts_password_reset_token",
                table: "passport_accounts");

            migrationBuilder.DropIndex(
                name: "idx_passport_accounts_provider_uid",
                table: "passport_accounts");

            migrationBuilder.DropColumn(
                name: "email_verification_token",
                table: "passport_accounts");

            migrationBuilder.DropColumn(
                name: "email_verification_token_expires_at",
                table: "passport_accounts");

            migrationBuilder.DropColumn(
                name: "full_name",
                table: "passport_accounts");

            migrationBuilder.DropColumn(
                name: "is_email_verified",
                table: "passport_accounts");

            migrationBuilder.DropColumn(
                name: "last_login_at",
                table: "passport_accounts");

            migrationBuilder.DropColumn(
                name: "password_hash",
                table: "passport_accounts");

            migrationBuilder.DropColumn(
                name: "password_reset_token",
                table: "passport_accounts");

            migrationBuilder.DropColumn(
                name: "password_reset_token_expires_at",
                table: "passport_accounts");

            migrationBuilder.AlterColumn<string>(
                name: "oauth_user_id",
                table: "passport_accounts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "oauth_provider",
                table: "passport_accounts",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_passport_accounts_provider_uid",
                table: "passport_accounts",
                columns: new[] { "oauth_provider", "oauth_user_id" },
                unique: true);
        }
    }
}
