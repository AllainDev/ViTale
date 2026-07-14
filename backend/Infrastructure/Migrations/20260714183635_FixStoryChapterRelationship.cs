using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixStoryChapterRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_checkpoints_story_chapters_StoryChapterId1",
                table: "checkpoints");

            migrationBuilder.DropIndex(
                name: "IX_checkpoints_StoryChapterId1",
                table: "checkpoints");

            migrationBuilder.DropColumn(
                name: "StoryChapterId1",
                table: "checkpoints");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "StoryChapterId1",
                table: "checkpoints",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_checkpoints_StoryChapterId1",
                table: "checkpoints",
                column: "StoryChapterId1");

            migrationBuilder.AddForeignKey(
                name: "FK_checkpoints_story_chapters_StoryChapterId1",
                table: "checkpoints",
                column: "StoryChapterId1",
                principalTable: "story_chapters",
                principalColumn: "id");
        }
    }
}
