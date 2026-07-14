using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRegionsAndForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "region_id",
                table: "products",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "region_id",
                table: "checkpoints",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "region_id",
                table: "characters",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "regions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    slug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_regions", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_products_region_id",
                table: "products",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "IX_checkpoints_region_id",
                table: "checkpoints",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "IX_characters_region_id",
                table: "characters",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "idx_regions_is_active",
                table: "regions",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "idx_regions_name",
                table: "regions",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_regions_slug",
                table: "regions",
                column: "slug",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_characters_regions_region_id",
                table: "characters",
                column: "region_id",
                principalTable: "regions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_checkpoints_regions_region_id",
                table: "checkpoints",
                column: "region_id",
                principalTable: "regions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_products_regions_region_id",
                table: "products",
                column: "region_id",
                principalTable: "regions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_characters_regions_region_id",
                table: "characters");

            migrationBuilder.DropForeignKey(
                name: "FK_checkpoints_regions_region_id",
                table: "checkpoints");

            migrationBuilder.DropForeignKey(
                name: "FK_products_regions_region_id",
                table: "products");

            migrationBuilder.DropTable(
                name: "regions");

            migrationBuilder.DropIndex(
                name: "IX_products_region_id",
                table: "products");

            migrationBuilder.DropIndex(
                name: "IX_checkpoints_region_id",
                table: "checkpoints");

            migrationBuilder.DropIndex(
                name: "IX_characters_region_id",
                table: "characters");

            migrationBuilder.DropColumn(
                name: "region_id",
                table: "products");

            migrationBuilder.DropColumn(
                name: "region_id",
                table: "checkpoints");

            migrationBuilder.DropColumn(
                name: "region_id",
                table: "characters");
        }
    }
}
