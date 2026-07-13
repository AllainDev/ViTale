using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "badges",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    image_url = table.Column<string>(type: "text", nullable: false),
                    condition_type = table.Column<string>(type: "text", nullable: false),
                    condition_value = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_badges", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "characters",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    region = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    model_url = table.Column<string>(type: "text", nullable: false),
                    animation_clips = table.Column<string>(type: "jsonb", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_characters", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "partners",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    type = table.Column<string>(type: "text", nullable: false),
                    contact_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    phone_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    latitude = table.Column<decimal>(type: "numeric(10,7)", nullable: true),
                    longitude = table.Column<decimal>(type: "numeric(10,7)", nullable: true),
                    priority_score = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partners", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "passport_accounts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    oauth_provider = table.Column<string>(type: "text", nullable: false),
                    oauth_user_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_passport_accounts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "story_chapters",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    content_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    region = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    unlock_condition = table.Column<string>(type: "jsonb", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_story_chapters", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "translations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    language_code = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    content_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    content_value = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_translations", x => x.id);
                });

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

            migrationBuilder.CreateTable(
                name: "vouchers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    discount_type = table.Column<string>(type: "text", nullable: false),
                    discount_value = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    minimum_spend = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    max_redemptions = table.Column<int>(type: "integer", nullable: true),
                    valid_from = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    valid_until = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vouchers", x => x.id);
                    table.ForeignKey(
                        name: "FK_vouchers_partners_partner_id",
                        column: x => x.partner_id,
                        principalTable: "partners",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "travelers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    anonymous_id = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    linked_account_id = table.Column<Guid>(type: "uuid", nullable: true),
                    preferences = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_travelers", x => x.id);
                    table.ForeignKey(
                        name: "FK_travelers_passport_accounts_linked_account_id",
                        column: x => x.linked_account_id,
                        principalTable: "passport_accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "checkpoints",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    latitude = table.Column<decimal>(type: "numeric(10,7)", nullable: false),
                    longitude = table.Column<decimal>(type: "numeric(10,7)", nullable: false),
                    radius = table.Column<int>(type: "integer", nullable: false),
                    story_chapter_id = table.Column<Guid>(type: "uuid", nullable: true),
                    region = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checkpoints", x => x.id);
                    table.ForeignKey(
                        name: "FK_checkpoints_story_chapters_story_chapter_id",
                        column: x => x.story_chapter_id,
                        principalTable: "story_chapters",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "traveler_vouchers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    traveler_id = table.Column<Guid>(type: "uuid", nullable: false),
                    voucher_id = table.Column<Guid>(type: "uuid", nullable: false),
                    claimed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    redeemed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    redemption_code = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_traveler_vouchers", x => x.id);
                    table.ForeignKey(
                        name: "FK_traveler_vouchers_vouchers_voucher_id",
                        column: x => x.voucher_id,
                        principalTable: "vouchers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chat_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    traveler_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_message_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    turn_count = table.Column<int>(type: "integer", nullable: false),
                    condensed_context = table.Column<string>(type: "text", nullable: true),
                    current_checkpoint_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_chat_sessions_travelers_traveler_id",
                        column: x => x.traveler_id,
                        principalTable: "travelers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    qr_code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    product_type = table.Column<string>(type: "text", nullable: false),
                    region = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    activated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    activated_by_traveler_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.id);
                    table.ForeignKey(
                        name: "FK_products_travelers_activated_by_traveler_id",
                        column: x => x.activated_by_traveler_id,
                        principalTable: "travelers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "checkin_records",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    traveler_id = table.Column<Guid>(type: "uuid", nullable: false),
                    checkpoint_id = table.Column<Guid>(type: "uuid", nullable: false),
                    checkin_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    client_generated_id = table.Column<Guid>(type: "uuid", nullable: false),
                    sync_status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checkin_records", x => x.id);
                    table.ForeignKey(
                        name: "FK_checkin_records_checkpoints_checkpoint_id",
                        column: x => x.checkpoint_id,
                        principalTable: "checkpoints",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_checkin_records_travelers_traveler_id",
                        column: x => x.traveler_id,
                        principalTable: "travelers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stamps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    traveler_id = table.Column<Guid>(type: "uuid", nullable: false),
                    checkpoint_id = table.Column<Guid>(type: "uuid", nullable: false),
                    image_url = table.Column<string>(type: "text", nullable: false),
                    earned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stamps", x => x.id);
                    table.ForeignKey(
                        name: "FK_stamps_checkpoints_checkpoint_id",
                        column: x => x.checkpoint_id,
                        principalTable: "checkpoints",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chat_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    audio_url = table.Column<string>(type: "text", nullable: true),
                    action_tags = table.Column<string[]>(type: "text[]", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_chat_messages_chat_sessions_session_id",
                        column: x => x.session_id,
                        principalTable: "chat_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_chat_messages_session_created",
                table: "chat_messages",
                columns: new[] { "session_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "idx_chat_sessions_traveler_id",
                table: "chat_sessions",
                column: "traveler_id");

            migrationBuilder.CreateIndex(
                name: "idx_checkin_records_idempotency",
                table: "checkin_records",
                columns: new[] { "traveler_id", "checkpoint_id", "client_generated_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_checkin_records_traveler_checkin",
                table: "checkin_records",
                columns: new[] { "traveler_id", "checkin_at" });

            migrationBuilder.CreateIndex(
                name: "IX_checkin_records_checkpoint_id",
                table: "checkin_records",
                column: "checkpoint_id");

            migrationBuilder.CreateIndex(
                name: "IX_checkpoints_story_chapter_id",
                table: "checkpoints",
                column: "story_chapter_id");

            migrationBuilder.CreateIndex(
                name: "idx_partners_priority_score",
                table: "partners",
                column: "priority_score");

            migrationBuilder.CreateIndex(
                name: "idx_passport_accounts_provider_user",
                table: "passport_accounts",
                columns: new[] { "oauth_provider", "oauth_user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_products_qr_code",
                table: "products",
                column: "qr_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_products_activated_by_traveler_id",
                table: "products",
                column: "activated_by_traveler_id");

            migrationBuilder.CreateIndex(
                name: "idx_stamps_traveler_checkpoint",
                table: "stamps",
                columns: new[] { "traveler_id", "checkpoint_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_stamps_traveler_id",
                table: "stamps",
                column: "traveler_id");

            migrationBuilder.CreateIndex(
                name: "IX_stamps_checkpoint_id",
                table: "stamps",
                column: "checkpoint_id");

            migrationBuilder.CreateIndex(
                name: "idx_translations_lookup",
                table: "translations",
                columns: new[] { "language_code", "content_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_traveler_badges_traveler_id",
                table: "traveler_badges",
                column: "traveler_id");

            migrationBuilder.CreateIndex(
                name: "IX_traveler_badges_badge_id",
                table: "traveler_badges",
                column: "badge_id");

            migrationBuilder.CreateIndex(
                name: "idx_traveler_vouchers_redemption_code",
                table: "traveler_vouchers",
                column: "redemption_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_traveler_vouchers_traveler_id",
                table: "traveler_vouchers",
                column: "traveler_id");

            migrationBuilder.CreateIndex(
                name: "IX_traveler_vouchers_voucher_id",
                table: "traveler_vouchers",
                column: "voucher_id");

            migrationBuilder.CreateIndex(
                name: "idx_travelers_anonymous_id",
                table: "travelers",
                column: "anonymous_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_travelers_linked_account_id",
                table: "travelers",
                column: "linked_account_id");

            migrationBuilder.CreateIndex(
                name: "idx_vouchers_partner_id",
                table: "vouchers",
                column: "partner_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "characters");

            migrationBuilder.DropTable(
                name: "chat_messages");

            migrationBuilder.DropTable(
                name: "checkin_records");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "stamps");

            migrationBuilder.DropTable(
                name: "translations");

            migrationBuilder.DropTable(
                name: "traveler_badges");

            migrationBuilder.DropTable(
                name: "traveler_vouchers");

            migrationBuilder.DropTable(
                name: "chat_sessions");

            migrationBuilder.DropTable(
                name: "checkpoints");

            migrationBuilder.DropTable(
                name: "badges");

            migrationBuilder.DropTable(
                name: "vouchers");

            migrationBuilder.DropTable(
                name: "travelers");

            migrationBuilder.DropTable(
                name: "story_chapters");

            migrationBuilder.DropTable(
                name: "partners");

            migrationBuilder.DropTable(
                name: "passport_accounts");
        }
    }
}

