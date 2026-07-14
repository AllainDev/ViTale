using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Traveler> Travelers => Set<Traveler>();
    public DbSet<PassportAccount> PassportAccounts => Set<PassportAccount>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Character> Characters => Set<Character>();
    public DbSet<Checkpoint> Checkpoints => Set<Checkpoint>();
    public DbSet<StoryChapter> StoryChapters => Set<StoryChapter>();
    public DbSet<CheckinRecord> CheckinRecords => Set<CheckinRecord>();
    public DbSet<Stamp> Stamps => Set<Stamp>();
    public DbSet<Badge> Badges => Set<Badge>();

    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<TravelerVoucher> TravelerVouchers => Set<TravelerVoucher>();
    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<Translation> Translations => Set<Translation>();
    // CollectionItem removed — catalog data is now stored directly on Product.
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<DollToken> DollTokens => Set<DollToken>();
    public DbSet<UserGamificationProfile> UserGamificationProfiles => Set<UserGamificationProfile>();
    public DbSet<XpTransaction> XpTransactions => Set<XpTransaction>();
    public DbSet<UserStamp> UserStamps => Set<UserStamp>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();
    public DbSet<HanoiKnowledge> HanoiKnowledges => Set<HanoiKnowledge>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Traveler ──────────────────────────────────────────
        modelBuilder.Entity<Traveler>(e =>
        {
            e.ToTable("travelers");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.AnonymousId).HasColumnName("anonymous_id").HasMaxLength(12);
            e.Property(x => x.LinkedAccountId).HasColumnName("linked_account_id");
            e.Property(x => x.Preferences).HasColumnName("preferences").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            e.HasIndex(x => x.AnonymousId).IsUnique().HasDatabaseName("idx_travelers_anonymous_id");
            e.HasOne<PassportAccount>().WithMany().HasForeignKey(x => x.LinkedAccountId)
             .IsRequired(false).OnDelete(DeleteBehavior.SetNull);
        });

        // ── PassportAccount ───────────────────────────────────
        modelBuilder.Entity<PassportAccount>(e =>
        {
            e.ToTable("passport_accounts");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.OAuthProvider).HasColumnName("oauth_provider")
             .HasConversion(
                v => v.HasValue ? v.Value.ToString() : null,
                v => v != null ? Enum.Parse<OAuthProvider>(v) : (OAuthProvider?)null);
            e.Property(x => x.OAuthUserId).HasColumnName("oauth_user_id").HasMaxLength(100);
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            e.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(100);
            e.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(100);
            e.Property(x => x.IsEmailVerified).HasColumnName("is_email_verified").HasDefaultValue(false);
            e.Property(x => x.EmailVerificationToken).HasColumnName("email_verification_token").HasMaxLength(50);
            e.Property(x => x.EmailVerificationTokenExpiresAt).HasColumnName("email_verification_token_expires_at");
            e.Property(x => x.PasswordResetToken).HasColumnName("password_reset_token").HasMaxLength(50);
            e.Property(x => x.PasswordResetTokenExpiresAt).HasColumnName("password_reset_token_expires_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.IsLocked).HasColumnName("is_locked").HasDefaultValue(false);
            e.Property(x => x.LastLoginAt).HasColumnName("last_login_at");

            e.HasIndex(x => new { x.OAuthProvider, x.OAuthUserId })
             .HasDatabaseName("idx_passport_accounts_provider_uid");
            e.HasIndex(x => x.Email).IsUnique()
             .HasDatabaseName("idx_passport_accounts_email");
            e.HasIndex(x => x.EmailVerificationToken)
             .HasDatabaseName("idx_passport_accounts_email_verification_token");
            e.HasIndex(x => x.PasswordResetToken)
             .HasDatabaseName("idx_passport_accounts_password_reset_token");
        });

        // ── AdminUser ─────────────────────────────────────────
        modelBuilder.Entity<AdminUser>(e =>
        {
            e.ToTable("admin_users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Username).HasColumnName("username").HasMaxLength(100);
            e.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(255);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            e.HasIndex(x => x.Username).IsUnique().HasDatabaseName("idx_admin_users_username");
        });

        // ── Product ───────────────────────────────────────────
        // A Product serves as both the customer-facing catalog item AND the
        // gamification entity. Products of type Doll can be linked to a 3D Character
        // model and have QR DollTokens. All products appear in the customer catalog.
        modelBuilder.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");

            // Catalog display fields
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Material).HasColumnName("material").HasMaxLength(100);
            e.Property(x => x.Price).HasColumnName("price").HasMaxLength(50);
            e.Property(x => x.IsHighlight).HasColumnName("is_highlight").HasDefaultValue(false);
            e.Property(x => x.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);

            // Classification fields
            e.Property(x => x.Sku).HasColumnName("sku").HasMaxLength(64).IsRequired(false);
            e.Property(x => x.ProductType).HasColumnName("product_type")
             .HasConversion(v => v.ToString(), v => Enum.Parse<ProductType>(v));
            e.Property(x => x.Region).HasColumnName("region").HasMaxLength(100);
            e.Property(x => x.ImageUrl).HasColumnName("image_url").IsRequired(false);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            e.HasIndex(x => x.Sku).HasDatabaseName("idx_products_sku")
             .HasFilter("sku IS NOT NULL");
            e.HasIndex(x => new { x.ProductType, x.Region })
             .HasDatabaseName("idx_products_type_region");
            e.HasIndex(x => x.IsDeleted).HasDatabaseName("idx_products_is_deleted");

            e.HasMany(x => x.DollTokens)
             .WithOne(t => t.Doll)
             .HasForeignKey(t => t.DollId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasMany(x => x.Characters)
             .WithOne(c => c.Product)
             .HasForeignKey(c => c.ProductId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Character ─────────────────────────────────────────
        modelBuilder.Entity<Character>(e =>
        {
            e.ToTable("characters");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(100);
            e.Property(x => x.Region).HasColumnName("region").HasMaxLength(100);
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.ModelUrl).HasColumnName("model_url");
            e.Property(x => x.AnimationClips).HasColumnName("animation_clips").HasColumnType("jsonb");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);
        });

        // ── StoryChapter ──────────────────────────────────────
        modelBuilder.Entity<StoryChapter>(e =>
        {
            e.ToTable("story_chapters");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(200);
            e.Property(x => x.ContentKey).HasColumnName("content_key").HasMaxLength(100);
            e.Property(x => x.Region).HasColumnName("region").HasMaxLength(100);
            e.Property(x => x.UnlockCondition).HasColumnName("unlock_condition").HasColumnType("jsonb");
            e.Property(x => x.SortOrder).HasColumnName("sort_order");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        // ── Checkpoint ────────────────────────────────────────
        modelBuilder.Entity<Checkpoint>(e =>
        {
            e.ToTable("checkpoints");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200);
            e.Property(x => x.Latitude).HasColumnName("latitude").HasColumnType("decimal(10,7)");
            e.Property(x => x.Longitude).HasColumnName("longitude").HasColumnType("decimal(10,7)");
            e.Property(x => x.Radius).HasColumnName("radius");
            e.Property(x => x.StoryChapterId).HasColumnName("story_chapter_id");
            e.Property(x => x.Region).HasColumnName("region").HasMaxLength(100);
            e.Property(x => x.StoryAssetUrl).HasColumnName("story_asset_url").IsRequired(false);
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            e.HasOne(x => x.StoryChapter).WithMany().HasForeignKey(x => x.StoryChapterId)
             .IsRequired(false).OnDelete(DeleteBehavior.SetNull);
        });

        // ── CheckinRecord ─────────────────────────────────────
        modelBuilder.Entity<CheckinRecord>(e =>
        {
            e.ToTable("checkin_records");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TravelerId).HasColumnName("traveler_id");
            e.Property(x => x.CheckpointId).HasColumnName("checkpoint_id");
            e.Property(x => x.CheckinAt).HasColumnName("checkin_at");
            e.Property(x => x.ClientGeneratedId).HasColumnName("client_generated_id");
            e.Property(x => x.SyncStatus).HasColumnName("sync_status")
             .HasConversion(v => v.ToString(), v => Enum.Parse<SyncStatus>(v));
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            // GPS fields
            e.Property(x => x.Latitude).HasColumnName("latitude").HasColumnType("decimal(10,7)").HasDefaultValue(0.0);
            e.Property(x => x.Longitude).HasColumnName("longitude").HasColumnType("decimal(10,7)").HasDefaultValue(0.0);
            e.Property(x => x.Accuracy).HasColumnName("accuracy").IsRequired(false);

            // Gamification fields
            e.Property(x => x.DollTokenId).HasColumnName("doll_token_id").IsRequired(false);
            e.Property(x => x.XpAwarded).HasColumnName("xp_awarded").HasDefaultValue(0);

            e.Ignore(x => x.IsTokenCheckin); // computed property — not persisted

            e.HasIndex(["TravelerId", "CheckinAt"]).HasDatabaseName("idx_checkin_records_traveler_checkin");
            e.HasIndex(["TravelerId", "CheckpointId", "ClientGeneratedId"]).IsUnique()
             .HasDatabaseName("idx_checkin_records_idempotency");

            e.HasOne(x => x.Traveler).WithMany().HasForeignKey(x => x.TravelerId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Checkpoint).WithMany().HasForeignKey(x => x.CheckpointId).OnDelete(DeleteBehavior.Cascade);

            // Tight FK to DollToken — nullable so set-null on delete preserves CheckinRecord.
            e.HasOne(x => x.DollToken)
             .WithMany(t => t.CheckinRecords)
             .HasForeignKey(x => x.DollTokenId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Stamp ─────────────────────────────────────────────
        modelBuilder.Entity<Stamp>(e =>
        {
            e.ToTable("stamps");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TravelerId).HasColumnName("traveler_id");
            e.Property(x => x.CheckpointId).HasColumnName("checkpoint_id");
            e.Property(x => x.ImageUrl).HasColumnName("image_url");
            e.Property(x => x.EarnedAt).HasColumnName("earned_at");

            e.HasIndex(["TravelerId", "CheckpointId"]).IsUnique().HasDatabaseName("idx_stamps_traveler_checkpoint");
            e.HasIndex(x => x.TravelerId).HasDatabaseName("idx_stamps_traveler_id");
            e.HasOne(x => x.Checkpoint).WithMany().HasForeignKey(x => x.CheckpointId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── Badge ─────────────────────────────────────────────
        modelBuilder.Entity<Badge>(e =>
        {
            e.ToTable("badges");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(100);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.ImageUrl).HasColumnName("image_url");
            e.Property(x => x.ConditionType).HasColumnName("condition_type")
             .HasConversion(v => v.ToString(), v => Enum.Parse<ConditionType>(v));
            e.Property(x => x.ConditionValue).HasColumnName("condition_value").HasColumnType("jsonb");
        });


        // ── Partner ───────────────────────────────────────────
        modelBuilder.Entity<Partner>(e =>
        {
            e.ToTable("partners");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200);
            e.Property(x => x.Type).HasColumnName("type")
             .HasConversion(v => v.ToString(), v => Enum.Parse<PartnerType>(v));
            e.Property(x => x.ContactEmail).HasColumnName("contact_email").HasMaxLength(255);
            e.Property(x => x.PhoneNumber).HasColumnName("phone_number").HasMaxLength(50);
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.Latitude).HasColumnName("latitude").HasColumnType("decimal(10,7)");
            e.Property(x => x.Longitude).HasColumnName("longitude").HasColumnType("decimal(10,7)");
            e.Property(x => x.PriorityScore).HasColumnName("priority_score");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            e.HasIndex(x => x.PriorityScore).HasDatabaseName("idx_partners_priority_score");
            e.HasMany(x => x.Vouchers).WithOne(v => v.Partner).HasForeignKey(v => v.PartnerId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── Voucher ───────────────────────────────────────────
        modelBuilder.Entity<Voucher>(e =>
        {
            e.ToTable("vouchers");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.PartnerId).HasColumnName("partner_id");
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(200);
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.DiscountType).HasColumnName("discount_type")
             .HasConversion(v => v.ToString(), v => Enum.Parse<DiscountType>(v));
            e.Property(x => x.DiscountValue).HasColumnName("discount_value").HasColumnType("decimal(10,2)");
            e.Property(x => x.MinimumSpend).HasColumnName("minimum_spend").HasColumnType("decimal(10,2)");
            e.Property(x => x.MaxRedemptions).HasColumnName("max_redemptions");
            e.Property(x => x.ValidFrom).HasColumnName("valid_from");
            e.Property(x => x.ValidUntil).HasColumnName("valid_until");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            e.HasIndex(x => x.PartnerId).HasDatabaseName("idx_vouchers_partner_id");
        });

        // ── TravelerVoucher ───────────────────────────────────
        modelBuilder.Entity<TravelerVoucher>(e =>
        {
            e.ToTable("traveler_vouchers");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TravelerId).HasColumnName("traveler_id");
            e.Property(x => x.VoucherId).HasColumnName("voucher_id");
            e.Property(x => x.ClaimedAt).HasColumnName("claimed_at");
            e.Property(x => x.RedeemedAt).HasColumnName("redeemed_at");
            e.Property(x => x.RedemptionCode).HasColumnName("redemption_code").HasMaxLength(8);

            e.HasIndex(x => x.RedemptionCode).IsUnique().HasDatabaseName("idx_traveler_vouchers_redemption_code");
            e.HasIndex(x => x.TravelerId).HasDatabaseName("idx_traveler_vouchers_traveler_id");
            e.HasOne(x => x.Voucher).WithMany().HasForeignKey(x => x.VoucherId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── ChatSession ───────────────────────────────────────
        modelBuilder.Entity<ChatSession>(e =>
        {
            e.ToTable("chat_sessions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TravelerId).HasColumnName("traveler_id");
            e.Property(x => x.StartedAt).HasColumnName("started_at");
            e.Property(x => x.LastMessageAt).HasColumnName("last_message_at");
            e.Property(x => x.TurnCount).HasColumnName("turn_count");
            e.Property(x => x.CondensedContext).HasColumnName("condensed_context");
            e.Property(x => x.CurrentCheckpointId).HasColumnName("current_checkpoint_id");

            e.HasIndex(x => x.TravelerId).HasDatabaseName("idx_chat_sessions_traveler_id");
            e.HasOne<Traveler>().WithMany().HasForeignKey(x => x.TravelerId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Messages).WithOne().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── ChatMessage ───────────────────────────────────────
        modelBuilder.Entity<ChatMessage>(e =>
        {
            e.ToTable("chat_messages");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.SessionId).HasColumnName("session_id");
            e.Property(x => x.Role).HasColumnName("role")
             .HasConversion(v => v.ToString(), v => Enum.Parse<MessageRole>(v));
            e.Property(x => x.Content).HasColumnName("content");
            e.Property(x => x.AudioUrl).HasColumnName("audio_url");
            e.Property(x => x.ActionTags).HasColumnName("action_tags").HasColumnType("text[]");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            e.HasIndex(x => new { x.SessionId, x.CreatedAt }).HasDatabaseName("idx_chat_messages_session_created");
        });

        // ── Translation ───────────────────────────────────────
        modelBuilder.Entity<Translation>(e =>
        {
            e.ToTable("translations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.LanguageCode).HasColumnName("language_code").HasMaxLength(5);
            e.Property(x => x.ContentKey).HasColumnName("content_key").HasMaxLength(100);
            e.Property(x => x.ContentValue).HasColumnName("content_value");

            e.HasIndex(["LanguageCode", "ContentKey"]).IsUnique().HasDatabaseName("idx_translations_lookup");
        });

        // ── DollToken ──────────────────────────────────────────
        // Token format: "VID-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" (up to 64 chars).
        // Stores the actual QR code printed on the physical doll packaging.
        modelBuilder.Entity<DollToken>(e =>
        {
            e.ToTable("doll_tokens");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Token).HasColumnName("token").HasMaxLength(64).IsRequired();
            e.Property(x => x.DollId).HasColumnName("doll_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.GeneratedAt).HasColumnName("generated_at");
            e.Property(x => x.ClaimedAt).HasColumnName("claimed_at");
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            e.Property(x => x.IsUsed).HasColumnName("is_used").HasDefaultValue(false);
            e.Property(x => x.UsedAt).HasColumnName("used_at");
            e.Property(x => x.RowVersion).HasColumnName("row_version").IsConcurrencyToken().ValueGeneratedNever();

            e.HasIndex(x => x.Token).IsUnique().HasDatabaseName("idx_doll_tokens_token");
            e.HasIndex(x => x.DollId).HasDatabaseName("idx_doll_tokens_doll_id");
            e.HasIndex(x => x.UserId).HasDatabaseName("idx_doll_tokens_user_id");
        });

        // ── XpTransaction ─────────────────────────────────────
        modelBuilder.Entity<XpTransaction>(e =>
        {
            e.ToTable("xp_transactions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Amount).HasColumnName("amount");
            e.Property(x => x.Source).HasColumnName("source")
             .HasConversion(v => v.ToString(), v => Enum.Parse<XpSource>(v));
            e.Property(x => x.Timestamp).HasColumnName("timestamp");

            e.HasIndex(x => x.UserId).HasDatabaseName("idx_xp_transactions_user_id");
        });

        // CollectionItem table removed — data migrated to products table.

        // ── UserGamificationProfile ────────────────────────────
        modelBuilder.Entity<UserGamificationProfile>(e =>
        {
            e.ToTable("user_gamification_profiles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.TotalXp).HasColumnName("total_xp").HasDefaultValue(0);
            e.Property(x => x.CurrentLevel).HasColumnName("current_level").HasDefaultValue(0);
            e.Property(x => x.CheckinsCount).HasColumnName("checkins_count").HasDefaultValue(0);
            e.Property(x => x.StampsUnlocked).HasColumnName("stamps_unlocked").HasDefaultValue(0);
            e.Property(x => x.BadgesEarned).HasColumnName("badges_earned").HasDefaultValue(0);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.LastUpdatedAt).HasColumnName("last_updated_at");
            e.Property(x => x.RowVersion).HasColumnName("row_version").IsConcurrencyToken().ValueGeneratedNever();

            e.HasIndex(x => x.UserId).IsUnique()
             .HasDatabaseName("idx_user_gamification_profiles_user_id");

            // Two-way nav: Stamps ↔ Profile (cascade delete of profile purges stamps).
            e.HasMany(x => x.Stamps)
             .WithOne(s => s.Profile)
             .HasForeignKey(s => s.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            // Two-way nav: Badges ↔ Profile (cascade delete of profile purges badges).
            e.HasMany(x => x.Badges)
             .WithOne(b => b.Profile)
             .HasForeignKey(b => b.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasMany(x => x.XpTransactions)
             .WithOne()
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── UserStamp ──────────────────────────────────────────
        // Navigations: Profile (FK to UserGamificationProfile, cascade) +
        //              Checkpoint (FK to Checkpoint, restrict — do not cascade-delete
        //              a checkpoint just because a user earned a stamp there).
        modelBuilder.Entity<UserStamp>(e =>
        {
            e.ToTable("user_stamps");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.CheckpointId).HasColumnName("checkpoint_id");
            e.Property(x => x.UnlockedAt).HasColumnName("unlocked_at");
            e.Property(x => x.HasDollBonus).HasColumnName("has_doll_bonus").HasDefaultValue(false);

            e.HasIndex(x => new { x.UserId, x.CheckpointId }).IsUnique()
             .HasDatabaseName("idx_user_stamps_user_checkpoint");
            e.HasIndex(x => x.UserId).HasDatabaseName("idx_user_stamps_user_id");

            // Profile FK is already declared on the principal side (UserGamificationProfile.Stamps).
            // Here we explicitly declare Checkpoint FK so EF treats it as a real FK instead
            // of a dangling Guid.
            e.HasOne(x => x.Checkpoint)
             .WithMany()
             .HasForeignKey(x => x.CheckpointId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── UserBadge ──────────────────────────────────────────
        // Navigations: Profile (FK to UserGamificationProfile, cascade) +
        //              Badge (FK to Badge, cascade — when a Badge is deleted, all
        //              earned entries go with it).
        modelBuilder.Entity<UserBadge>(e =>
        {
            e.ToTable("user_badges");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.BadgeId).HasColumnName("badge_id");
            e.Property(x => x.EarnedAt).HasColumnName("earned_at");

            e.HasIndex(x => new { x.UserId, x.BadgeId }).IsUnique()
             .HasDatabaseName("idx_user_badges_user_badge");
            e.HasIndex(x => x.UserId).HasDatabaseName("idx_user_badges_user_id");

            // Badge FK: explicitly declared so EF treats it as a real FK instead
            // of a dangling Guid.
            e.HasOne(x => x.Badge)
             .WithMany(b => b.UserBadges)
             .HasForeignKey(x => x.BadgeId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── HanoiKnowledge ──────────────────────────────────────
        modelBuilder.Entity<HanoiKnowledge>(e =>
        {
            e.ToTable("hanoi_knowledge");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(50).IsRequired();
            e.Property(x => x.Topic).HasColumnName("topic").HasMaxLength(200).IsRequired();
            e.Property(x => x.Question).HasColumnName("question").IsRequired();
            e.Property(x => x.Answer).HasColumnName("answer").IsRequired();
            e.Property(x => x.Keywords).HasColumnName("keywords");
            e.Property(x => x.Language).HasColumnName("language").HasMaxLength(2).IsRequired();
            e.Property(x => x.Source).HasColumnName("source").HasMaxLength(200);
            e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");

            e.HasIndex(x => x.Language).HasDatabaseName("idx_hanoi_knowledge_lang")
                .HasFilter("is_active = true");
            e.HasIndex(x => x.Category).HasDatabaseName("idx_hanoi_knowledge_category")
                .HasFilter("is_active = true");
        });
    }
}

