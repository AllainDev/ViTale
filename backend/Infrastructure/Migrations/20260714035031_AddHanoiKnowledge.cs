using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHanoiKnowledge : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ensure unaccent extension exists before the generated column references it (idempotent)
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS unaccent;");

            migrationBuilder.CreateTable(
                name: "hanoi_knowledge",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    topic = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    question = table.Column<string>(type: "text", nullable: false),
                    answer = table.Column<string>(type: "text", nullable: false),
                    keywords = table.Column<string>(type: "text", nullable: true),
                    language = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    source = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hanoi_knowledge", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "idx_hanoi_knowledge_category",
                table: "hanoi_knowledge",
                column: "category",
                filter: "is_active = true");

            migrationBuilder.CreateIndex(
                name: "idx_hanoi_knowledge_lang",
                table: "hanoi_knowledge",
                column: "language",
                filter: "is_active = true");

            // Generated tsvector column (Postgres 12+) with unaccent for Vietnamese diacritics.
            // A generated STORED column requires an IMMUTABLE expression, but the single-arg
            // unaccent(text) is only STABLE. Wrap it in an IMMUTABLE function that pins the
            // dictionary so it is safe to use in a generated column / index.
            migrationBuilder.Sql("""
                CREATE OR REPLACE FUNCTION f_unaccent_immutable(text)
                RETURNS text
                LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
                AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
                """);

            migrationBuilder.Sql("""
                ALTER TABLE hanoi_knowledge
                ADD COLUMN search_vector tsvector
                GENERATED ALWAYS AS (
                    to_tsvector('simple',
                        f_unaccent_immutable(coalesce(question,'') || ' ' ||
                                 coalesce(answer,'') || ' ' ||
                                 coalesce(keywords,'')))
                ) STORED;
                """);

            migrationBuilder.Sql("""
                CREATE INDEX idx_hanoi_knowledge_search
                ON hanoi_knowledge USING GIN(search_vector);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "hanoi_knowledge");

            migrationBuilder.Sql("DROP FUNCTION IF EXISTS f_unaccent_immutable(text);");
        }
    }
}
