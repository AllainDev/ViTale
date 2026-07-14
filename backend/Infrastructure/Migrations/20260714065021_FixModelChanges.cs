using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "traveler_badges");

            migrationBuilder.AddColumn<bool>(
                name: "IsAnonymous",
                table: "travelers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "story_chapters",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "CharacterId",
                table: "checkpoints",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StoryChapterId1",
                table: "checkpoints",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_checkpoints_CharacterId",
                table: "checkpoints",
                column: "CharacterId");

            migrationBuilder.CreateIndex(
                name: "IX_checkpoints_StoryChapterId1",
                table: "checkpoints",
                column: "StoryChapterId1");

            migrationBuilder.AddForeignKey(
                name: "FK_checkpoints_characters_CharacterId",
                table: "checkpoints",
                column: "CharacterId",
                principalTable: "characters",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_checkpoints_story_chapters_StoryChapterId1",
                table: "checkpoints",
                column: "StoryChapterId1",
                principalTable: "story_chapters",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_checkpoints_characters_CharacterId",
                table: "checkpoints");

            migrationBuilder.DropForeignKey(
                name: "FK_checkpoints_story_chapters_StoryChapterId1",
                table: "checkpoints");

            migrationBuilder.DropIndex(
                name: "IX_checkpoints_CharacterId",
                table: "checkpoints");

            migrationBuilder.DropIndex(
                name: "IX_checkpoints_StoryChapterId1",
                table: "checkpoints");

            migrationBuilder.DropColumn(
                name: "IsAnonymous",
                table: "travelers");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "story_chapters");

            migrationBuilder.DropColumn(
                name: "CharacterId",
                table: "checkpoints");

            migrationBuilder.DropColumn(
                name: "StoryChapterId1",
                table: "checkpoints");

            migrationBuilder.CreateTable(
                name: "traveler_badges",
                columns: table => new
                {
                    traveler_id = table.Column<Guid>(type: "uuid", nullable: false),
                    badge_id = table.Column<Guid>(type: "uuid", nullable: false),
                    earned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_traveler_badges", x => new { x.traveler_id, x.badge_id });
                    table.ForeignKey(
                        name: "FK_traveler_badges_badges_badge_id",
                        column: x => x.badge_id,
                        principalTable: "badges",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_traveler_badges_traveler_id",
                table: "traveler_badges",
                column: "traveler_id");

            migrationBuilder.CreateIndex(
                name: "IX_traveler_badges_badge_id",
                table: "traveler_badges",
                column: "badge_id");
        }
    }
}
