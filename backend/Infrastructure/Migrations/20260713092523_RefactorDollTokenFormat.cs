using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RefactorDollTokenFormat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_products_travelers_activated_by_traveler_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "idx_products_qr_code",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_products_activated_by_traveler_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "activated_at",
                table: "products");

            migrationBuilder.DropColumn(
                name: "activated_by_traveler_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "qr_code",
                table: "products");

            migrationBuilder.AlterColumn<string>(
                name: "region",
                table: "products",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            migrationBuilder.AddColumn<string>(
                name: "sku",
                table: "products",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "token",
                table: "doll_tokens",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(16)",
                oldMaxLength: 16);

            migrationBuilder.CreateIndex(
                name: "idx_products_sku",
                table: "products",
                column: "sku",
                filter: "sku IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_products_sku",
                table: "products");

            migrationBuilder.DropColumn(
                name: "sku",
                table: "products");

            migrationBuilder.AlterColumn<string>(
                name: "region",
                table: "products",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<DateTime>(
                name: "activated_at",
                table: "products",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "activated_by_traveler_id",
                table: "products",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "qr_code",
                table: "products",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "token",
                table: "doll_tokens",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64);

            migrationBuilder.CreateIndex(
                name: "idx_products_qr_code",
                table: "products",
                column: "qr_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_activated_by_traveler_id",
                table: "products",
                column: "activated_by_traveler_id");

            migrationBuilder.AddForeignKey(
                name: "FK_products_travelers_activated_by_traveler_id",
                table: "products",
                column: "activated_by_traveler_id",
                principalTable: "travelers",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
