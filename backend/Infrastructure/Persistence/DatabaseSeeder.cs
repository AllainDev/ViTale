using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using System.Text.Json;

namespace Infrastructure.Persistence;

/// <summary>
/// Seeds initial data for development and production — 15 Hanoi checkpoints, 1 character,
/// 3 story chapters, 5 badges, and 10 partner businesses with vouchers.
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

    public static async Task SeedAsync(ApplicationDbContext db)
    {
        // Add required PostGIS extension
        await db.Database.ExecuteSqlRawAsync("CREATE EXTENSION IF NOT EXISTS postgis;");

        await SeedCharactersAsync(db);
        await SeedStoryChaptersAsync(db);
        await SeedCheckpointsAsync(db);
        await SeedBadgesAsync(db);
        await SeedPartnersAsync(db);
        await SeedCollectionsAsync(db);
        await SeedAdminUserAsync(db);
        await db.SaveChangesAsync();
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

        var animationClips = JsonDocument.Parse("""
            {
                "WAVE": "Wave_Anim",
                "SMILE": "Smile_Anim",
                "NOD": "Nod_Anim",
                "POINT": "Point_Anim",
                "BOW": "Bow_Anim",
                "DANCE": "Dance_Anim"
            }
            """);

        // Use raw SQL to set specific ID (EF doesn't allow setting Guid PK for value-generated keys)
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO characters (id, name, region, model_url, animation_clips, description)
            VALUES ({0}, {1}, {2}, {3}, {4}::jsonb, {5})
            ON CONFLICT (id) DO UPDATE SET model_url = EXCLUDED.model_url
            """,
            HanoiCharacterId,
            "Thăng Long Princess",
            "VN-HN",
            "/models/avatar.glb",
            animationClips.RootElement.GetRawText(),
            "A legendary princess from the Lý Dynasty who guards the secrets of Thăng Long Citadel.");
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
        // if (await db.Checkpoints.AnyAsync(c => c.Id == CheckpointIds[0])) return;

        // 15 real Hanoi tourist checkpoints
        var checkpoints = new[]
        {
            (CheckpointIds[0],  "Hoan Kiem Lake",             21.0285m, 105.8542m, 100, Story1Id, "Ha Noi"),
            (CheckpointIds[1],  "Dong Xuan Market",           21.0367m, 105.8497m, 150, Story2Id, "Ha Noi"),
            (CheckpointIds[2],  "St. Joseph's Cathedral",     21.0275m, 105.8488m, 100, Story2Id, "Ha Noi"),
            (CheckpointIds[3],  "Temple of Literature",       21.0236m, 105.8357m, 120, Story3Id, "Ha Noi"),
            (CheckpointIds[4],  "Ho Chi Minh Mausoleum",     21.0370m, 105.8345m, 200, Story3Id, "Ha Noi"),
            (CheckpointIds[5],  "One Pillar Pagoda",          21.0357m, 105.8347m, 80,  Story3Id, "Ha Noi"),
            (CheckpointIds[6],  "Hoa Lo Prison Museum",       21.0289m, 105.8453m, 100, (Guid?)null, "Ha Noi"),
            (CheckpointIds[7],  "National Museum of History", 21.0229m, 105.8597m, 100, (Guid?)null, "Ha Noi"),
            (CheckpointIds[8],  "Vietnam Museum of Ethnology",21.0338m, 105.8094m, 150, (Guid?)null, "Ha Noi"),
            (CheckpointIds[9],  "Long Bien Bridge",           21.0450m, 105.8573m, 300, (Guid?)null, "Ha Noi"),
            (CheckpointIds[10], "Bach Ma Temple",             21.0352m, 105.8507m, 80,  (Guid?)null, "Ha Noi"),
            (CheckpointIds[11], "Quan Thanh Temple",          21.0427m, 105.8378m, 100, (Guid?)null, "Ha Noi"),
            (CheckpointIds[12], "Tran Quoc Pagoda",           21.0456m, 105.8305m, 80,  (Guid?)null, "Ha Noi"),
            (CheckpointIds[13], "West Lake (Tay Ho)",         21.0545m, 105.8240m, 500, (Guid?)null, "Ha Noi"),
            (CheckpointIds[14], "Hanoi Opera House",          21.0241m, 105.8573m, 80,  (Guid?)null, "Ha Noi"),

            // Home Region
            (Guid.Parse("44444444-0000-0000-0000-000000000001"), "Nhà của bạn", 21.0275m, 105.8488m, 500, (Guid?)null, "Home"),

            // School Region
            (Guid.Parse("44444444-0000-0000-0000-000000000002"), "Trường học", 21.022320622035508m, 105.52057995771676m, 500, (Guid?)null, "School")
        };

        var allCheckpoints = checkpoints.ToList();
        for (int i = 1; i <= 10; i++)
        {
            allCheckpoints.Add((
                Guid.Parse($"55555555-0000-0000-0000-{i:D12}"), 
                $"Trường học Test {i}", 
                21.022320622035508m, 
                105.52057995771676m, 
                500, 
                (Guid?)null, 
                "School"
            ));
        }

        foreach (var (id, name, lat, lon, radius, storyId, regionName) in allCheckpoints)
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
                id, name, lat, lon, radius, storyId, regionName);
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

    private static async Task SeedCollectionsAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync("DELETE FROM collection_items");

        var items = new[]
        {
            (Guid.NewGuid(), "Crochet Heritage Doll", "Northern", "Hand-woven representation of traditional northern attire, crafted with zero-waste principles.", "Organic Cotton", "₫850,000", "https://lh3.googleusercontent.com/aida-public/AB6AXuBLbsUJJHJf6fFCamOHj56yiZbVNNMxY7XT8Y8zx3ugcLUx_wwUUo0oDgNL2X44WOiuBUMzCqJ64PkEkHVz3SfKnI5aDLun8nu0rgadQyFoeQ_wu0TdgIC9aecQJwVMsLJbiTqRLxVRy7V7HQfwkmpEKR8OVquGpwBqOTFdbSTbdsOitOUjV3-tNtUUH5W7KHbwS1aPbi5fBLLMOVO6249BACsc3E_en2xlzEC66tPYXNzA4SQEF-huRw", true),
            (Guid.NewGuid(), "Handmade Passport Cover", "Central", "Linen and pressed rice paper cover to protect your physical and digital memories.", "Recycled Paper", "₫450,000", "https://lh3.googleusercontent.com/aida-public/AB6AXuBsRmuef2oH4srUsQl77SBfVt3ZjPSJoP3fr3Wsr-JyWvmZMG_CmLW8SXUo5kfXP__U9GPvajLkirusOq7YMmgf4mi9kBi9vERj9uSidn3UBLLVTERE0UnGUx4GLlPS0Gj3mRVCTLTb9YXGBzP3WvDQk2i7hG34g-AcOxZLHdIOl4dY7Y7xDq_VF_8zxX79BM_WMfGpUiNMNAoGaofxgQ97R0CVzST0EYgSaPlwf3Hz-cXY-UnpWZgLuw", true),
            (Guid.NewGuid(), "Saigon Eco-Boutique Gift Set", "Southern", "A curated collection of sustainable luxuries featuring organic silk and natural botanicals.", "Silk", "850k VND", "https://lh3.googleusercontent.com/aida-public/AB6AXuDFyc0QKuwo_YYHnDwpArZdLqOZeYfmoQaZ4JDfDg0r7CJOkaEqw-IWSa9iZQv2H3t5ecrnqST_bIfW47K8fZXl0xy5LReLde5oOZgzXpNrROvOv8KKI0jG9iyJLj3naug0wNB5uo-elOXH8_TsG7IXZvoVKcYLxYghrVOWOX69m7XCyuI2rR7SSAqT9mxu6_bJ50JtVj3zRG1ITTVrg5qDHG0prAIoZL6ooXqnPgrm-KMsoSC0T-rX5g", true),
            (Guid.NewGuid(), "Sapa Indigo Charm", "Northern", "Hand-woven by the Hmong community using traditional loom techniques and deep natural indigo.", "Organic Cotton", "210k VND", "https://lh3.googleusercontent.com/aida-public/AB6AXuCPI5wMGtwxL23PMqLh8FW9qS5HraW2fwsQ1Aa3prY8sJ85Q4zidde0JcUapiKkFxtYi5oZKODf7rK5dpRFrnlMOBWrHL9ww1y8cGX1WT2oF-Q42lfWvZJ7mfbKNNfkBjKpjGtrkpUjbE6hYRdCP3NwdzeE8HEM9ZFtOIofYnKn5bIVurrM9NqKP52Ie4hkx9Zpz4OvPzUQ_H6XI3k2TDHurmm_s_cfvNYorDhhcj46Rj_NhsivZfjxyQ", false)
        };

        foreach (var (id, name, region, desc, material, price, img, highlight) in items)
        {
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO collection_items (id, name, region, description, material, price, image_url, is_highlight, is_deleted)
                VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, false)
                ON CONFLICT (id) DO NOTHING
                """,
                id, name, region, desc, material, price, img, highlight);
        }
    }
}

