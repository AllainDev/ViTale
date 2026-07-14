using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class IncreaseRegionLength : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_characters_products_ProductId",
                table: "characters");

            migrationBuilder.RenameColumn(
                name: "ProductId",
                table: "characters",
                newName: "product_id");

            migrationBuilder.RenameIndex(
                name: "IX_characters_ProductId",
                table: "characters",
                newName: "IX_characters_product_id");

            migrationBuilder.AlterColumn<string>(
                name: "region",
                table: "story_chapters",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            migrationBuilder.AlterColumn<string>(
                name: "region",
                table: "checkpoints",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            migrationBuilder.AlterColumn<string>(
                name: "region",
                table: "characters",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(10)",
                oldMaxLength: 10);

            migrationBuilder.AddForeignKey(
                name: "FK_characters_products_product_id",
                table: "characters",
                column: "product_id",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_characters_products_product_id",
                table: "characters");

            migrationBuilder.RenameColumn(
                name: "product_id",
                table: "characters",
                newName: "ProductId");

            migrationBuilder.RenameIndex(
                name: "IX_characters_product_id",
                table: "characters",
                newName: "IX_characters_ProductId");

            migrationBuilder.AlterColumn<string>(
                name: "region",
                table: "story_chapters",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "region",
                table: "checkpoints",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "region",
                table: "characters",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AddForeignKey(
                name: "FK_characters_products_ProductId",
                table: "characters",
                column: "ProductId",
                principalTable: "products",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
