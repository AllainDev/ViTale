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
        if (await db.Characters.AnyAsync(c => c.Id == HanoiCharacterId)) return;

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
            ON CONFLICT (id) DO NOTHING
            """,
            HanoiCharacterId,
            "Thăng Long Princess",
            "VN-HN",
            "https://app.vitale.vn/assets/characters/hanoi-princess-v1.glb",
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
        if (await db.Checkpoints.AnyAsync(c => c.Id == CheckpointIds[0])) return;

        // 15 real Hanoi tourist checkpoints (GPS coordinates verified)
        var checkpoints = new[]
        {
            (CheckpointIds[0],  "Hoan Kiem Lake",             21.0285m, 105.8542m, 100, Story1Id),
            (CheckpointIds[1],  "Dong Xuan Market",           21.0367m, 105.8497m, 150, Story2Id),
            (CheckpointIds[2],  "St. Joseph's Cathedral",     21.0275m, 105.8488m, 100, Story2Id),
            (CheckpointIds[3],  "Temple of Literature",       21.0236m, 105.8357m, 120, Story3Id),
            (CheckpointIds[4],  "Ho Chi Minh Mausoleum",     21.0370m, 105.8345m, 200, Story3Id),
            (CheckpointIds[5],  "One Pillar Pagoda",          21.0357m, 105.8347m, 80,  Story3Id),
            (CheckpointIds[6],  "Hoa Lo Prison Museum",       21.0289m, 105.8453m, 100, (Guid?)null),
            (CheckpointIds[7],  "National Museum of History", 21.0229m, 105.8597m, 100, (Guid?)null),
            (CheckpointIds[8],  "Vietnam Museum of Ethnology",21.0338m, 105.8094m, 150, (Guid?)null),
            (CheckpointIds[9],  "Long Bien Bridge",           21.0450m, 105.8573m, 300, (Guid?)null),
            (CheckpointIds[10], "Bach Ma Temple",             21.0352m, 105.8507m, 80,  (Guid?)null),
            (CheckpointIds[11], "Quan Thanh Temple",          21.0427m, 105.8378m, 100, (Guid?)null),
            (CheckpointIds[12], "Tran Quoc Pagoda",           21.0456m, 105.8305m, 80,  (Guid?)null),
            (CheckpointIds[13], "West Lake (Tay Ho)",         21.0545m, 105.8240m, 500, (Guid?)null),
            (CheckpointIds[14], "Hanoi Opera House",          21.0241m, 105.8573m, 80,  (Guid?)null),
        };

        foreach (var (id, name, lat, lon, radius, storyId) in checkpoints)
        {
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO checkpoints (id, name, latitude, longitude, radius, story_chapter_id, region, is_active, created_at)
                VALUES ({0}, {1}, {2}, {3}, {4}, {5}, 'VN-HN', true, NOW())
                ON CONFLICT (id) DO NOTHING
                """,
                id, name, lat, lon, radius, storyId);
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
        if (await db.CollectionItems.AnyAsync()) return;

        var items = new[]
        {
            (Guid.NewGuid(), "Non La", "VN", "Traditional Vietnamese conical hat", "Palm leaves", "150,000 VND", "/assets/collections/nonla.png", true),
            (Guid.NewGuid(), "Ao Dai", "VN", "Traditional Vietnamese dress", "Silk", "1,500,000 VND", "/assets/collections/aodai.png", true),
            (Guid.NewGuid(), "Dong Ho Painting", "VN", "Vietnamese folk woodcut painting", "Dzo paper", "300,000 VND", "/assets/collections/dongho.png", false),
            (Guid.NewGuid(), "Water Puppet", "VN", "Traditional water puppet from Red River Delta", "Wood", "500,000 VND", "/assets/collections/puppet.png", false)
        };

        foreach (var (id, name, region, desc, material, price, img, highlight) in items)
        {
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO collection_items (id, name, region, description, material, price, image_url, is_highlight)
                VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7})
                ON CONFLICT (id) DO NOTHING
                """,
                id, name, region, desc, material, price, img, highlight);
        }
    }
}

