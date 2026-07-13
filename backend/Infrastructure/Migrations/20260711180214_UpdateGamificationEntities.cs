using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateGamificationEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "journey_card_url",
                table: "checkin_records");

            migrationBuilder.AddColumn<bool>(
                name: "has_doll_bonus",
                table: "user_stamps",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "story_asset_url",
                table: "checkpoints",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "has_doll_bonus",
                table: "user_stamps");

            migrationBuilder.DropColumn(
                name: "story_asset_url",
                table: "checkpoints");

            migrationBuilder.AddColumn<string>(
                name: "journey_card_url",
                table: "checkin_records",
                type: "text",
                nullable: true);
        }
    }
}
