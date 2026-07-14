using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeedRegionsFromExistingCheckpoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Step 1: Insert one Region row per distinct region string ──────────────
            // Collects all distinct non-empty region values across checkpoints,
            // characters, and products, then inserts them into the regions table.
            migrationBuilder.Sql(@"
                INSERT INTO regions (id, name, slug, description, sort_order, is_active, created_at)
                SELECT
                    gen_random_uuid(),
                    region_name,
                    lower(
                        regexp_replace(
                            translate(
                                regexp_replace(region_name, '[àáâãäåạăắặấầẩẫậ]', 'a', 'g'),
                                'đĐ', 'dD'
                            ),
                            '[^a-zA-Z0-9\s-]', '', 'g'
                        )
                    ) || '-' || substr(md5(region_name), 1, 4),
                    NULL,
                    ROW_NUMBER() OVER (ORDER BY region_name) - 1,
                    true,
                    NOW()
                FROM (
                    SELECT DISTINCT TRIM(region) AS region_name
                    FROM (
                        SELECT region FROM checkpoints  WHERE region IS NOT NULL AND TRIM(region) <> ''
                        UNION
                        SELECT region FROM characters   WHERE region IS NOT NULL AND TRIM(region) <> ''
                        UNION
                        SELECT region FROM products     WHERE region IS NOT NULL AND TRIM(region) <> ''
                    ) all_regions
                ) distinct_regions
                WHERE region_name <> ''
                  AND NOT EXISTS (
                      SELECT 1 FROM regions r WHERE r.name = region_name
                  );
            ");

            // ── Step 2: Link checkpoints → regions ───────────────────────────────────
            migrationBuilder.Sql(@"
                UPDATE checkpoints c
                SET region_id = r.id
                FROM regions r
                WHERE TRIM(c.region) = r.name
                  AND c.region_id IS NULL;
            ");

            // ── Step 3: Link characters → regions ────────────────────────────────────
            migrationBuilder.Sql(@"
                UPDATE characters c
                SET region_id = r.id
                FROM regions r
                WHERE TRIM(c.region) = r.name
                  AND c.region_id IS NULL;
            ");

            // ── Step 4: Link products → regions ──────────────────────────────────────
            migrationBuilder.Sql(@"
                UPDATE products p
                SET region_id = r.id
                FROM regions r
                WHERE TRIM(p.region) = r.name
                  AND p.region_id IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove the auto-generated region_id links and delete seeded regions
            migrationBuilder.Sql("UPDATE checkpoints SET region_id = NULL;");
            migrationBuilder.Sql("UPDATE characters  SET region_id = NULL;");
            migrationBuilder.Sql("UPDATE products    SET region_id = NULL;");
            migrationBuilder.Sql(@"
                DELETE FROM regions
                WHERE description IS NULL;
            ");
        }
    }
}
