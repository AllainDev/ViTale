using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProductIdToCharacter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "product_id",
                table: "characters",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_characters_product_id",
                table: "characters",
                column: "product_id");

            migrationBuilder.AddForeignKey(
                name: "fk_characters_products_product_id",
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
                name: "fk_characters_products_product_id",
                table: "characters");

            migrationBuilder.DropIndex(
                name: "ix_characters_product_id",
                table: "characters");

            migrationBuilder.DropColumn(
                name: "product_id",
                table: "characters");
        }
    }
}
