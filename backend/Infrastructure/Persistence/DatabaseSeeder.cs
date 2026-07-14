using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using System.Text.Json;

namespace Infrastructure.Persistence;

/// <summary>
/// Seeds initial data for development and production — Hanoi (15), Ho Chi Minh (8),
/// Da Nang (8) checkpoints, 1 character, 3 story chapters, 5 badges, and 10 partner
/// businesses with vouchers.
/// </summary>
public static class DatabaseSeeder
{
    // Pre-defined GUIDs so seeding is idempotent across re-runs
    private static readonly Guid HanoiCharacterId = Guid.Parse("11111111-0000-0000-0000-000000000001");
    private static readonly Guid Story1Id = Guid.Parse("22222222-0000-0000-0000-000000000001");
    private static readonly Guid Story2Id = Guid.Parse("22222222-0000-0000-0000-000000000002");
    private static readonly Guid Story3Id = Guid.Parse("22222222-0000-0000-0000-000000000003");

    // Checkpoint IDs for 15 Hanoi locations
    private static readonly Guid[] CheckpointIds = Enumerable.Range(1, 15)
        .Select(i => Guid.Parse($"33333333-0000-0000-0000-{i:D12}"))
        .ToArray();

    // Checkpoint IDs for 8 Ho Chi Minh City locations (prefix: 66666666)
    private static readonly Guid[] HcmCheckpointIds = Enumerable.Range(1, 8)
        .Select(i => Guid.Parse($"66666666-0000-0000-0000-{i:D12}"))
        .ToArray();

    // Checkpoint IDs for 8 Da Nang locations (prefix: 77777777)
    private static readonly Guid[] DaNangCheckpointIds = Enumerable.Range(1, 8)
        .Select(i => Guid.Parse($"77777777-0000-0000-0000-{i:D12}"))
        .ToArray();

    // ── Pre-defined GUIDs for dev seed (idempotent across re-runs) ─────────────
    private static readonly Guid DevAccountId   = Guid.Parse("99999999-0000-0000-0000-000000000001");
    private static readonly Guid DevTravelerId  = Guid.Parse("99999999-0000-0000-0000-000000000002");
    private static readonly Guid HanoiDollProductId = Guid.Parse("44444444-0000-0000-0000-000000000001");
    private static readonly Guid DevDollTokenId = Guid.Parse("99999999-0000-0000-0000-000000000004");

    private const string DevEmail    = "dev@vitale.vn";
    private const string DevPassword = "DevPass123!";

    public static async Task SeedAsync(ApplicationDbContext db, bool isDevelopment = false)
    {
        // Add required PostGIS extension
        await db.Database.ExecuteSqlRawAsync("CREATE EXTENSION IF NOT EXISTS postgis;");

        await SeedCharactersAsync(db);
        await SeedStoryChaptersAsync(db);
        await SeedCheckpointsAsync(db);
        await SeedBadgesAsync(db);
        await SeedPartnersAsync(db);
        await SeedProductsAsync(db);
        await SeedAdminUserAsync(db);

        // Tạm thời seed tài khoản dev@vitale.vn ở cả môi trường thật để bạn test
        await SeedDevUserAsync(db);

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Seeds a pre-verified dev user with one pre-owned doll so the developer can
    /// land directly on the 3D Assistant screen via <c>?screen=assistant&amp;dev=1</c>
    /// without scanning a QR code. Only runs when <c>isDevelopment</c> is true.
    /// </summary>
    private static async Task SeedDevUserAsync(ApplicationDbContext db)
    {
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(DevPassword, workFactor: 12);
        var now = DateTime.UtcNow;

        // 1. Pre-verified PassportAccount
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO passport_accounts
                (id, email, password_hash, full_name, is_email_verified,
                 email_verification_token, email_verification_token_expires_at,
                 password_reset_token, password_reset_token_expires_at,
                 created_at, is_locked)
            VALUES
                ({0}, {1}, {2}, {3}, true,
                 NULL, NULL,
                 NULL, NULL,
                 {4}, false)
            ON CONFLICT (id) DO NOTHING
            """,
            DevAccountId, DevEmail, passwordHash, "Dev User", now);

        // 2. Traveler linked to the dev account
        var devPreferencesJson = "{\"preferredLanguage\":\"vi\",\"notificationsEnabled\":true}";
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO travelers
                (id, anonymous_id, linked_account_id, preferences, created_at)
            VALUES
                ({0}, {1}, {2},
                 CAST({3} AS jsonb),
                 {4})
            ON CONFLICT (id) DO NOTHING
            """,
            DevTravelerId, "dev-traveler", DevAccountId, devPreferencesJson, now);

        // 3. Pre-claimed DollToken for the dev traveler (linking to HanoiDollProductId created in SeedProductsAsync)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO doll_tokens
                (id, token, doll_id, user_id, generated_at, claimed_at,
                 expires_at, is_used, used_at, row_version)
            VALUES
                ({0}, {1}, {2}, {3}, {4}, {4},
                 NULL, false, NULL, {5})
            ON CONFLICT (id) DO UPDATE SET doll_id = EXCLUDED.doll_id
            """,
            DevDollTokenId, "VID-DEV-0000-0000-0000-0000-0000-0001",
            HanoiDollProductId, DevTravelerId, now, Guid.NewGuid().ToByteArray());

        // 5. Gamification profile for the dev traveler
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO user_gamification_profiles
                (id, user_id, total_xp, current_level, checkins_count,
                 stamps_unlocked, badges_earned, created_at, last_updated_at, row_version)
            VALUES
                (gen_random_uuid(), {0}, 0, 0, 0, 0, 0, {1}, {1}, {2})
            ON CONFLICT (user_id) DO NOTHING
            """,
            DevTravelerId, now, Guid.NewGuid().ToByteArray());
    }

    private static async Task SeedAdminUserAsync(ApplicationDbContext db)
    {
        if (await db.AdminUsers.AnyAsync()) return;

        // Uses BCrypt.Net-Next to hash passwords
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");
        var admin = AdminUser.Create("admin", passwordHash);
        
        await db.Database.ExecuteSqlRawAsync(
            "INSERT INTO admin_users (id, username, password_hash, created_at) VALUES ({0}, {1}, {2}, {3})",
            admin.Id, admin.Username, admin.PasswordHash, admin.CreatedAt);
    }

    private static async Task SeedCharactersAsync(ApplicationDbContext db)
    {

        var animationClips = """
            {
                "WAVE": "Wave_Anim",
                "SMILE": "Smile_Anim",
                "NOD": "Nod_Anim",
                "POINT": "Point_Anim",
                "BOW": "Bow_Anim",
                "DANCE": "Dance_Anim"
            }
            """;

        // Use raw SQL to set specific ID (EF doesn't allow setting Guid PK for value-generated keys)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO characters (id, name, region, model_url, animation_clips, description)
            VALUES ({0}, {1}, {2}, {3}, {4}::jsonb, {5})
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                model_url = EXCLUDED.model_url,
                description = EXCLUDED.description
            """,
            HanoiCharacterId,
            "Nàng Mai",
            "VN-HN",
            "/models/avatar.glb",
            animationClips,
            "Nàng Mai — hướng dẫn viên AI văn hoá Hà Nội, am hiểu 36 phố phường, ẩm thực vỉa hè và lịch sử nghìn năm Thăng Long.");
    }

    private static async Task SeedStoryChaptersAsync(ApplicationDbContext db)
    {
        if (await db.StoryChapters.AnyAsync(s => s.Id == Story1Id)) return;

        var stories = new[]
        {
            (Story1Id, "The Legend of Sword Lake", "story.hanoi.sword_lake",
             $"{{\"requiredCheckpointIds\": [\"{CheckpointIds[0]}\"]}}",
             1),
            (Story2Id, "Secrets of the Old Quarter", "story.hanoi.old_quarter",
             $"{{\"requiredCheckpointIds\": [\"{CheckpointIds[1]}\", \"{CheckpointIds[2]}\"]}}",
             2),
            (Story3Id, "The Temple of Literature", "story.hanoi.temple_literature",
             $"{{\"requiredCheckpointIds\": [\"{CheckpointIds[3]}\", \"{CheckpointIds[4]}\", \"{CheckpointIds[5]}\"]}}",
             3),
        };

        foreach (var (id, title, key, unlock, order) in stories)
        {
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO story_chapters (id, title, content_key, region, unlock_condition, sort_order, created_at)
                VALUES ({0}, {1}, {2}, {3}, {4}::jsonb, {5}, NOW())
                ON CONFLICT (id) DO NOTHING
                """,
                id, title, key, "VN-HN", unlock, order);
        }
    }

    private static async Task SeedCheckpointsAsync(ApplicationDbContext db)
    {
        // Seed only "Hà Nội" region checkpoints. Home + School regions have been
        // intentionally removed (see bug #4 — Trường ĐH FPT now lives in Hà Nội).
        //
        // The 15 historical checkpoints + 1 school checkpoint (Trường ĐH FPT)
        // all share the canonical "Hà Nội" region label so the frontend
        // passport view only renders a single region tab.

        // Remove old Home and School checkpoints from DB
        // First delete any referencing user_stamps to avoid FK violation
        await db.Database.ExecuteSqlRawAsync("DELETE FROM user_stamps WHERE checkpoint_id IN (SELECT id FROM checkpoints WHERE region IN ('Home', 'School'))");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM checkpoints WHERE region IN ('Home', 'School')");

        // 15 real Hanoi tourist checkpoints — unchanged IDs to keep migrations stable.
        var checkpoints = new[]
        {
            (CheckpointIds[0],  "Hoan Kiem Lake",             21.0285m, 105.8542m, 100, Story1Id, "Hà Nội"),
            (CheckpointIds[1],  "Dong Xuan Market",           21.0367m, 105.8497m, 150, Story2Id, "Hà Nội"),
            (CheckpointIds[2],  "St. Joseph's Cathedral",     21.0275m, 105.8488m, 100, Story2Id, "Hà Nội"),
            (CheckpointIds[3],  "Temple of Literature",       21.0236m, 105.8357m, 120, Story3Id, "Hà Nội"),
            (CheckpointIds[4],  "Ho Chi Minh Mausoleum",     21.0370m, 105.8345m, 200, Story3Id, "Hà Nội"),
            (CheckpointIds[5],  "One Pillar Pagoda",          21.0357m, 105.8347m, 80,  Story3Id, "Hà Nội"),
            (CheckpointIds[6],  "Hoa Lo Prison Museum",       21.0289m, 105.8453m, 100, (Guid?)null, "Hà Nội"),
            (CheckpointIds[7],  "National Museum of History", 21.0229m, 105.8597m, 100, (Guid?)null, "Hà Nội"),
            (CheckpointIds[8],  "Vietnam Museum of Ethnology",21.0338m, 105.8094m, 150, (Guid?)null, "Hà Nội"),
            (CheckpointIds[9],  "Long Bien Bridge",           21.0450m, 105.8573m, 300, (Guid?)null, "Hà Nội"),
            (CheckpointIds[10], "Bach Ma Temple",             21.0352m, 105.8507m, 80,  (Guid?)null, "Hà Nội"),
            (CheckpointIds[11], "Quan Thanh Temple",          21.0427m, 105.8378m, 100, (Guid?)null, "Hà Nội"),
            (CheckpointIds[12], "Tran Quoc Pagoda",           21.0456m, 105.8305m, 80,  (Guid?)null, "Hà Nội"),
            (CheckpointIds[13], "West Lake (Tay Ho)",         21.0545m, 105.8240m, 500, (Guid?)null, "Hà Nội"),
            (CheckpointIds[14], "Hanoi Opera House",          21.0241m, 105.8573m, 80,  (Guid?)null, "Hà Nội"),

            // School location (Trường ĐH FPT) — moved into "Hà Nội" region per bug #4.
            // Coordinates taken from the previous "School"-region location (FPT University Hanoi).
            (Guid.Parse("55555555-0000-0000-0000-000000000001"), "Trường ĐH FPT", 21.022320622035508m, 105.52057995771676m, 500, (Guid?)null, "Hà Nội")
        };



        foreach (var (id, name, lat, lon, radius, storyId, regionName) in checkpoints)
        {
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO checkpoints (id, name, latitude, longitude, radius, story_chapter_id, region, is_active, created_at)
                VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, true, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    radius = EXCLUDED.radius,
                    region = EXCLUDED.region
                """,
                id, name, lat, lon, radius, (object?)storyId, regionName);
        }

        // ── Hồ Chí Minh City checkpoints ─────────────────────────────────────
        var hcmCheckpoints = new[]
        {
            (HcmCheckpointIds[0], "Bến Thành Market",          10.7725m, 106.6980m, 150, "Hồ Chí Minh"),
            (HcmCheckpointIds[1], "Reunification Palace",      10.7769m, 106.6956m, 120, "Hồ Chí Minh"),
            (HcmCheckpointIds[2], "War Remnants Museum",       10.7797m, 106.6924m, 100, "Hồ Chí Minh"),
            (HcmCheckpointIds[3], "Notre-Dame Cathedral",      10.7797m, 106.6990m, 100, "Hồ Chí Minh"),
            (HcmCheckpointIds[4], "Jade Emperor Pagoda",       10.7902m, 106.6902m, 80,  "Hồ Chí Minh"),
            (HcmCheckpointIds[5], "Bui Vien Walking Street",   10.7672m, 106.6921m, 200, "Hồ Chí Minh"),
            (HcmCheckpointIds[6], "Bitexco Financial Tower",   10.7717m, 106.7040m, 100, "Hồ Chí Minh"),
            (HcmCheckpointIds[7], "Cu Chi Tunnels",            11.1422m, 106.4629m, 300, "Hồ Chí Minh"),
        };

        foreach (var (id, name, lat, lon, radius, regionName) in hcmCheckpoints)
        {
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO checkpoints (id, name, latitude, longitude, radius, story_chapter_id, region, is_active, created_at)
                VALUES ({0}, {1}, {2}, {3}, {4}, NULL, {5}, true, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    radius = EXCLUDED.radius,
                    region = EXCLUDED.region
                """,
                id, name, lat, lon, radius, regionName);
        }

        // ── Đà Nẵng checkpoints ───────────────────────────────────────────────
        var daNangCheckpoints = new[]
        {
            (DaNangCheckpointIds[0], "Dragon Bridge",          16.0610m, 108.2275m, 150, "Đà Nẵng"),
            (DaNangCheckpointIds[1], "Marble Mountains",       15.9731m, 108.2620m, 200, "Đà Nẵng"),
            (DaNangCheckpointIds[2], "My Khe Beach",           16.0539m, 108.2474m, 300, "Đà Nẵng"),
            (DaNangCheckpointIds[3], "Han Market",             16.0657m, 108.2232m, 100, "Đà Nẵng"),
            (DaNangCheckpointIds[4], "Museum of Cham Sculpture",16.0620m, 108.2200m, 80,  "Đà Nẵng"),
            (DaNangCheckpointIds[5], "Ba Na Hills",            15.9972m, 107.9891m, 500, "Đà Nẵng"),
            (DaNangCheckpointIds[6], "Son Tra Peninsula",      16.1048m, 108.2742m, 400, "Đà Nẵng"),
            (DaNangCheckpointIds[7], "Da Nang Cathedral",      16.0687m, 108.2204m, 80,  "Đà Nẵng"),
        };

        foreach (var (id, name, lat, lon, radius, regionName) in daNangCheckpoints)
        {
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO checkpoints (id, name, latitude, longitude, radius, story_chapter_id, region, is_active, created_at)
                VALUES ({0}, {1}, {2}, {3}, {4}, NULL, {5}, true, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    radius = EXCLUDED.radius,
                    region = EXCLUDED.region
                """,
                id, name, lat, lon, radius, regionName);
        }
    }


    private static async Task SeedBadgesAsync(ApplicationDbContext db)
    {
        if (await db.Badges.AnyAsync()) return;

        var badges = new[]
        {
            (Guid.NewGuid(), "Hanoi Explorer", "Visited 5 checkpoints in Hanoi",
             "/assets/badges/hanoi-explorer.png", "CheckpointCount",
             "{\"count\": 5}"),
            (Guid.NewGuid(), "Culture Buff", "Visited all temple and museum checkpoints",
             "/assets/badges/culture-buff.png", "RegionComplete",
             "{\"region\": \"VN-HN\"}"),
            (Guid.NewGuid(), "Foodie", "Claimed 3 restaurant vouchers",
             "/assets/badges/foodie.png", "VoucherCount",
             "{\"count\": 3, \"category\": \"food\"}"),
            (Guid.NewGuid(), "Week Warrior", "Explored Hanoi for 7 consecutive days",
             "/assets/badges/week-warrior.png", "ConsecutiveDays",
             "{\"days\": 7}"),
            (Guid.NewGuid(), "Partner Patron", "Visited 3 partner businesses",
             "/assets/badges/partner-patron.png", "PartnerVisit",
             "{\"count\": 3}"),
        };

        foreach (var (id, name, desc, imgUrl, condType, condVal) in badges)
        {
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO badges (id, name, description, image_url, condition_type, condition_value)
                VALUES ({0}, {1}, {2}, {3}, {4}, {5}::jsonb)
                ON CONFLICT (id) DO NOTHING
                """,
                id, name, desc, imgUrl, condType, condVal);
        }
    }

    private static async Task SeedPartnersAsync(ApplicationDbContext db)
    {
        if (await db.Partners.AnyAsync()) return;

        var partnersData = new[]
        {
            ("Hanoi Pho House",         "Restaurant",   21.0275m, 105.8510m, 90),
            ("Bun Cha Huong Lien",      "Restaurant",   21.0280m, 105.8485m, 85),
            ("Banh Mi 25",              "Restaurant",   21.0305m, 105.8530m, 80),
            ("Cha Ca La Vong",          "Restaurant",   21.0352m, 105.8503m, 75),
            ("Café Dinh",               "Restaurant",   21.0270m, 105.8545m, 70),
            ("Sofitel Legend Metropole","Hotel",         21.0230m, 105.8580m, 95),
            ("Hanoi Boutique Hotel",    "Hotel",         21.0315m, 105.8490m, 75),
            ("La Siesta Hotel Trendy",  "Hotel",         21.0268m, 105.8480m, 70),
            ("Hanoi City Tour",         "TourOperator", 21.0285m, 105.8542m, 80),
            ("Indochina Junks",         "TourOperator", 21.0285m, 105.8542m, 75),
        };

        foreach (var (name, type, lat, lon, priority) in partnersData)
        {
            var partnerId = Guid.NewGuid();
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO partners (id, name, type, latitude, longitude, priority_score, is_active, contact_email, address, created_at)
                VALUES ({0}, {1}, {2}, {3}, {4}, {5}, true, {6}, 'Hanoi, Vietnam', NOW())
                ON CONFLICT (id) DO NOTHING
                """,
                partnerId, name, type, lat, lon, priority, $"info@{name.ToLower().Replace(" ", "")}.vn");

            // Add a sample voucher for each partner
            var from = DateTime.UtcNow;
            var until = from.AddDays(90);
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO vouchers (id, partner_id, title, description, discount_type, discount_value, max_redemptions, valid_from, valid_until, is_active, created_at)
                VALUES (gen_random_uuid(), {0}, {1}, {2}, 'Percentage', 15, 100, {3}, {4}, true, NOW())
                ON CONFLICT DO NOTHING
                """,
                partnerId,
                $"15% off at {name}",
                "Present this code to the staff. Valid for all menu items.",
                from, until);
        }
    }
    private static async Task SeedProductsAsync(ApplicationDbContext db)
    {
        // Seed the existing Hanoi Doll as a Product with full catalog info
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO products (id, name, region, product_type, sku, image_url, description, material, price, is_highlight, is_deleted, created_at)
            VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, false, {10})
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
            """,
            HanoiDollProductId,
            "Búp Bê Thăng Long",
            "Hà Nội",
            "Doll",
            "SKU-HANOI-001",
            (object?)null,
            "Búp bê truyền thống mang hình tượng Công chúa triều Lý, đại diện cho văn hóa Hà Nội nghìn năm văn hiến.",
            "Bông hữu cơ",
            "₫850,000",
            true,
            DateTime.UtcNow);

        // Link the existing HanoiCharacterId to this product
        await db.Database.ExecuteSqlRawAsync("""
            UPDATE characters SET product_id = {0} WHERE id = {1}
            """,
            HanoiDollProductId, HanoiCharacterId);

        // Seed additional catalog products (non-doll)
        var catalogItems = new[]
        {
            (Guid.Parse("44444444-0000-0000-0000-000000000002"),
             "Vỏ Hộ Chiếu Thủ Công", "Hội An", "PassportCover", (string?)null,
             "https://lh3.googleusercontent.com/aida-public/AB6AXuBsRmuef2oH4srUsQl77SBfVt3ZjPSJoP3fr3Wsr-JyWvmZMG_CmLW8SXUo5kfXP__U9GPvajLkirusOq7YMmgf4mi9kBi9vERj9uSidn3UBLLVTERE0UnGUx4GLlPS0Gj3mRVCTLTb9YXGBzP3WvDQk2i7hG34g-AcOxZLHdIOl4dY7Y7xDq_VF_8zxX79BM_WMfGpUiNMNAoGaofxgQ97R0CVzST0EYgSaPlwf3Hz-cXY-UnpWZgLuw",
             "Vỏ hộ chiếu thủ công bằng vải lanh và giấy gạo ép. Bảo vệ ký ức cả thể chất lẫn số.", "Giấy tái chế", "₫450,000", false),
            (Guid.Parse("44444444-0000-0000-0000-000000000003"),
             "Set Quà Eco Sài Gòn", "TP. Hồ Chí Minh", "PassportCover", (string?)null,
             "https://lh3.googleusercontent.com/aida-public/AB6AXuDFyc0QKuwo_YYHnDwpArZdLqOZeYfmoQaZ4JDfDg0r7CJOkaEqw-IWSa9iZQv2H3t5ecrnqST_bIfW47K8fZXl0xy5LReLde5oOZgzXpNrROvOv8KKI0jG9iyJLj3naug0wNB5uo-elOXH8_TsG7IXZvoVKcYLxYghrVOWOX69m7XCyuI2rR7SSAqT9mxu6_bJ50JtVj3zRG1ITTVrg5qDHG0prAIoZL6ooXqnPgrm-KMsoSC0T-rX5g",
             "Bộ sưu tập xa xỉ bền vững với lụa hữu cơ và thảo mộc tự nhiên từ miền Nam.", "Lụa", "₫850,000", true),
            (Guid.Parse("44444444-0000-0000-0000-000000000004"),
             "Dây Chàm Sapa", "Sapa", "PassportCover", (string?)null,
             "https://lh3.googleusercontent.com/aida-public/AB6AXuCPI5wMGtwxL23PMqLh8FW9qS5HraW2fwsQ1Aa3prY8sJ85Q4zidde0JcUapiKkFxtYi5oZKODf7rK5dpRFrnlMOBWrHL9ww1y8cGX1WT2oF-Q42lfWvZJ7mfbKNNfkBjKpjGtrkpUjbE6hYRdCP3NwdzeE8HEM9ZFtOIofYnKn5bIVurrM9NqKP52Ie4hkx9Zpz4OvPzUQ_H6XI3k2TDHurmm_s_cfvNYorDhhcj46Rj_NhsivZfjxyQ",
             "Dệt tay bởi cộng đồng H'Mông bằng kỹ thuật dệt thủ công truyền thống và chàm tự nhiên.", "Bông hữu cơ", "₫210,000", false)
        };

        foreach (var (id, name, region, type, sku, img, desc, material, price, highlight) in catalogItems)
        {
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO products (id, name, region, product_type, sku, image_url, description, material, price, is_highlight, is_deleted, created_at)
                VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9}, false, {10})
                ON CONFLICT (id) DO NOTHING
                """,
                id, name, region, type, (object?)sku, img, desc, material, price, highlight, DateTime.UtcNow);
        }
    }
}
