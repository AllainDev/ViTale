using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGamificationEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "accuracy",
                table: "checkin_records",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "doll_token_id",
                table: "checkin_records",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "journey_card_url",
                table: "checkin_records",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "latitude",
                table: "checkin_records",
                type: "numeric(10,7)",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "longitude",
                table: "checkin_records",
                type: "numeric(10,7)",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "xp_awarded",
                table: "checkin_records",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "doll_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    token = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    doll_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    generated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    claimed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_used = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    used_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    row_version = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_doll_tokens", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_gamification_profiles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    total_xp = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    current_level = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    checkins_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    stamps_unlocked = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    badges_earned = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    row_version = table.Column<byte[]>(type: "bytea", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_gamification_profiles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_badges",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    badge_id = table.Column<Guid>(type: "uuid", nullable: false),
                    earned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_badges", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_badges_user_gamification_profiles_user_id",
                        column: x => x.user_id,
                        principalTable: "user_gamification_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_stamps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    checkpoint_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unlocked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_stamps", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_stamps_user_gamification_profiles_user_id",
                        column: x => x.user_id,
                        principalTable: "user_gamification_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "xp_transactions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<int>(type: "integer", nullable: false),
                    source = table.Column<string>(type: "text", nullable: false),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_xp_transactions", x => x.id);
                    table.ForeignKey(
                        name: "FK_xp_transactions_user_gamification_profiles_user_id",
                        column: x => x.user_id,
                        principalTable: "user_gamification_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_doll_tokens_doll_id",
                table: "doll_tokens",
                column: "doll_id");

            migrationBuilder.CreateIndex(
                name: "idx_doll_tokens_token",
                table: "doll_tokens",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_doll_tokens_user_id",
                table: "doll_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "idx_user_badges_user_badge",
                table: "user_badges",
                columns: new[] { "user_id", "badge_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_user_badges_user_id",
                table: "user_badges",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "idx_user_gamification_profiles_user_id",
                table: "user_gamification_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_user_stamps_user_checkpoint",
                table: "user_stamps",
                columns: new[] { "user_id", "checkpoint_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_user_stamps_user_id",
                table: "user_stamps",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "idx_xp_transactions_user_id",
                table: "xp_transactions",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "doll_tokens");

            migrationBuilder.DropTable(
                name: "user_badges");

            migrationBuilder.DropTable(
                name: "user_stamps");

            migrationBuilder.DropTable(
                name: "xp_transactions");

            migrationBuilder.DropTable(
                name: "user_gamification_profiles");

            migrationBuilder.DropColumn(
                name: "accuracy",
                table: "checkin_records");

            migrationBuilder.DropColumn(
                name: "doll_token_id",
                table: "checkin_records");

            migrationBuilder.DropColumn(
                name: "journey_card_url",
                table: "checkin_records");

            migrationBuilder.DropColumn(
                name: "latitude",
                table: "checkin_records");

            migrationBuilder.DropColumn(
                name: "longitude",
                table: "checkin_records");

            migrationBuilder.DropColumn(
                name: "xp_awarded",
                table: "checkin_records");
        }
    }
}
