using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TightenRelationsAndFptHanoi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "image_url",
                table: "products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProductId",
                table: "characters",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_stamps_checkpoint_id",
                table: "user_stamps",
                column: "checkpoint_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_badges_badge_id",
                table: "user_badges",
                column: "badge_id");

            migrationBuilder.CreateIndex(
                name: "idx_products_type_region",
                table: "products",
                columns: new[] { "product_type", "region" });

            migrationBuilder.CreateIndex(
                name: "IX_checkin_records_doll_token_id",
                table: "checkin_records",
                column: "doll_token_id");

            migrationBuilder.CreateIndex(
                name: "IX_characters_ProductId",
                table: "characters",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_characters_products_ProductId",
                table: "characters",
                column: "ProductId",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_checkin_records_doll_tokens_doll_token_id",
                table: "checkin_records",
                column: "doll_token_id",
                principalTable: "doll_tokens",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_doll_tokens_products_doll_id",
                table: "doll_tokens",
                column: "doll_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_user_badges_badges_badge_id",
                table: "user_badges",
                column: "badge_id",
                principalTable: "badges",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_user_stamps_checkpoints_checkpoint_id",
                table: "user_stamps",
                column: "checkpoint_id",
                principalTable: "checkpoints",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_characters_products_ProductId",
                table: "characters");

            migrationBuilder.DropForeignKey(
                name: "FK_checkin_records_doll_tokens_doll_token_id",
                table: "checkin_records");

            migrationBuilder.DropForeignKey(
                name: "FK_doll_tokens_products_doll_id",
                table: "doll_tokens");

            migrationBuilder.DropForeignKey(
                name: "FK_user_badges_badges_badge_id",
                table: "user_badges");

            migrationBuilder.DropForeignKey(
                name: "FK_user_stamps_checkpoints_checkpoint_id",
                table: "user_stamps");

            migrationBuilder.DropIndex(
                name: "IX_user_stamps_checkpoint_id",
                table: "user_stamps");

            migrationBuilder.DropIndex(
                name: "IX_user_badges_badge_id",
                table: "user_badges");

            migrationBuilder.DropIndex(
                name: "idx_products_type_region",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_checkin_records_doll_token_id",
                table: "checkin_records");

            migrationBuilder.DropIndex(
                name: "IX_characters_ProductId",
                table: "characters");

            migrationBuilder.DropColumn(
                name: "image_url",
                table: "products");

            migrationBuilder.DropColumn(
                name: "ProductId",
                table: "characters");
        }
    }
}
