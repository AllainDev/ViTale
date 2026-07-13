# Implementation Plan: ViTale Platform Complete

## Overview

This implementation plan transforms the ViTale platform design into actionable coding tasks. The platform combines a .NET 10 backend API using Clean Architecture principles, a Next.js PWA frontend with offline-first capabilities, PostgreSQL database with PostGIS spatial support, and 3D character rendering through React Three Fiber. The implementation follows a bottom-up approach: Domain → Application → Infrastructure → API → Frontend → Integration.

The task list prioritizes establishing core infrastructure first (Docker, database, domain models), then building business logic layers, followed by API endpoints, and finally the frontend PWA with offline synchronization capabilities.

## Tasks

- [ ] 1. Infrastructure Foundation and Docker Setup
  - [ ] 1.1 Create Docker Compose configuration with API, Database, and Web services
    - Create `docker-compose.yml` with postgres:16-alpine image
    - Configure vitale_net private network for service isolation
    - Set up persistent volume for PostgreSQL data storage
    - Define environment variable placeholders for DB_CONNECTION_STRING, JWT_SECRET, GROQ_API_KEY
    - Add health checks for all three services (db, api, web)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ] 1.2 Create .env.example file documenting all required environment variables
    - Document DB_CONNECTION_STRING, JWT_SECRET, GROQ_API_KEY, AZURE_TTS_KEY, AZURE_TTS_REGION
    - Document OAUTH_APPLE_CLIENT_ID, OAUTH_GOOGLE_CLIENT_ID, COOKIE_DOMAIN, CORS_ORIGINS
    - Document CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY
    - _Requirements: 1.8, 42.1, 42.2, 42.3_

  - [ ] 1.3 Configure Cloudflare DNS and CDN for domain routing
    - Set up DNS A record for vitale.vn pointing to VPS IP
    - Create CNAME records for app.vitale.vn and api.vitale.vn
    - Enable Cloudflare proxy for SSL certificate provisioning
    - Configure cache rules for static assets (.glb, .png, .mp3, .jpg, .woff2) with 24-hour TTL
    - Enable Brotli compression and HTTP/2, HTTP/3 protocols
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [ ] 1.4 Set up Nginx reverse proxy configuration for API
    - Create nginx.conf with reverse proxy to localhost:5000
    - Configure SSL certificates from Let's Encrypt
    - Add security headers (HSTS, X-Content-Type-Options, X-Frame-Options)
    - Set up HTTP to HTTPS redirect
    - _Requirements: Design section "Nginx Configuration"_


- [ ] 2. Backend Clean Architecture Project Structure
  - [ ] 2.1 Create four .NET 10 projects with proper dependency structure
    - Create ViTale.Domain class library (netstandard2.1, zero external dependencies)
    - Create ViTale.Application class library (references Domain only)
    - Create ViTale.Infrastructure class library (references Domain and Application)
    - Create ViTale.WebApi ASP.NET Core Web API project (references Application and Infrastructure)
    - Configure project references and verify dependency flow
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 2.2 Set up backend Dockerfile with multi-stage build
    - Create Dockerfile using mcr.microsoft.com/dotnet/sdk:10.0 for build stage
    - Configure runtime stage with mcr.microsoft.com/dotnet/aspnet:10.0
    - Add curl installation for health checks
    - Set ASPNETCORE_URLS=http://+:5000 and expose port 5000
    - Target image size under 200MB
    - _Requirements: Design section "Backend Dockerfile"_

  - [ ]* 2.3 Write unit tests for Clean Architecture project structure
    - Test that Domain project has zero external dependencies
    - Test that Application references only Domain
    - Test that Infrastructure references Domain and Application
    - Test that WebApi references Application and Infrastructure
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [ ] 3. Domain Layer - Value Objects and Enums
  - [ ] 3.1 Implement QrCode value object with validation
    - Create QrCode value object validating 16-32 character alphanumeric format
    - Implement validation logic: only A-Z, a-z, 0-9 characters allowed
    - Add equality comparison and immutability
    - _Requirements: 6.3_

  - [ ] 3.2 Implement GeoCoordinate value object with validation
    - Create GeoCoordinate value object with Latitude and Longitude properties
    - Validate Latitude range: -90 to 90
    - Validate Longitude range: -180 to 180
    - Add haversine distance calculation method
    - _Requirements: 7.4, 18.6_

  - [ ] 3.3 Define domain enums for product types, badge conditions, and partner types
    - Create ProductType enum: Doll, PassportCover
    - Create OAuthProvider enum: Apple, Google
    - Create ConditionType enum: CheckpointCount, RegionComplete, VoucherCount, ConsecutiveDays, PartnerVisit
    - Create PartnerType enum: Restaurant, Hotel, TourOperator, Museum, Shop
    - Create DiscountType enum: Percentage, FixedAmount, FreeItem
    - Create SyncStatus enum: Pending, Synced
    - Create MessageRole enum: User, Assistant, System
    - _Requirements: 5.3, 6.1, 8.4, 9.4, 9.5, 7.3, 10.3_


- [ ] 4. Domain Layer - Core Entities
  - [ ] 4.1 Implement Traveler entity with anonymous and registered states
    - Create Traveler entity with Id (Guid), AnonymousId (string), LinkedAccountId (Guid?), Preferences (JSON), CreatedAt (DateTime)
    - Implement property: IsAnonymous (LinkedAccountId == null)
    - Implement property: IsRegistered (LinkedAccountId != null)
    - Use sequential GUID generation for performance
    - Store CreatedAt in UTC
    - _Requirements: 5.1, 5.3, 5.4, 5.7, 5.8_

  - [ ] 4.2 Implement PassportAccount entity for OAuth integration
    - Create PassportAccount entity with Id, OAuthProvider, OAuthUserId, Email, CreatedAt
    - Add validation: OAuthProvider must be Apple or Google
    - Add validation: Email format validation
    - _Requirements: 5.2, 5.9_

  - [ ] 4.3 Implement Product and Character entities
    - Create Product entity with Id, QRCode, ProductType, Region, ActivatedAt, ActivatedByTravelerId
    - Create Character entity with Id, Name, Region, ModelUrl, AnimationClips (JSONB), Description
    - Implement IsActivated property on Product (ActivatedAt != null)
    - Use ISO 3166-2 subdivision codes for Region (e.g., "VN-HN")
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ] 4.4 Implement StoryChapter and Checkpoint entities
    - Create StoryChapter entity with Id, Title, ContentKey, Region, UnlockCondition (JSONB), SortOrder
    - Create Checkpoint entity with Id, Name, Latitude, Longitude, Radius, StoryChapterId, Region, IsActive
    - Validate Radius between 10 and 1000 meters
    - UnlockCondition format: {"requiredCheckpointIds": ["guid1", "guid2"]}
    - _Requirements: 7.1, 7.2, 7.5, 7.6, 7.7_

  - [ ] 4.5 Implement CheckinRecord entity for location tracking
    - Create CheckinRecord entity with Id, TravelerId, CheckpointId, CheckinAt, ClientGeneratedId, SyncStatus
    - Support Pending and Synced status values
    - _Requirements: 7.3, 7.8, 7.9_

  - [ ] 4.6 Implement gamification entities: Stamp, Badge, TravelerBadge
    - Create Stamp entity with Id, TravelerId, CheckpointId, ImageUrl, EarnedAt
    - Create Badge entity with Id, Name, Description, ImageUrl, ConditionType, ConditionValue (JSONB)
    - Create TravelerBadge entity with TravelerId, BadgeId, EarnedAt (composite primary key)
    - Define ConditionValue formats for each ConditionType
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [ ] 4.7 Implement Partner and Voucher entities for B2B ecosystem
    - Create Partner entity with Id, Name, Type, ContactEmail, PhoneNumber, Address, Latitude, Longitude, PriorityScore, IsActive
    - Create Voucher entity with Id, PartnerId, Title, Description, DiscountType, DiscountValue, MinimumSpend, MaxRedemptions, ValidFrom, ValidUntil, IsActive
    - Create TravelerVoucher entity with Id, TravelerId, VoucherId, ClaimedAt, RedeemedAt, RedemptionCode
    - Validate PriorityScore range: 0 to 100
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [ ] 4.8 Implement ChatSession and ChatMessage entities
    - Create ChatSession entity with Id, TravelerId, StartedAt, LastMessageAt, TurnCount, CondensedContext, CurrentCheckpointId
    - Create ChatMessage entity with Id, SessionId, Role, Content, AudioUrl, ActionTags (string array), CreatedAt
    - Store all timestamps in UTC
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9, 10.10_


- [ ] 5. Domain Layer - Domain Events
  - [ ] 5.1 Implement domain events for key business actions
    - Create ProductActivatedEvent with ProductId and TravelerId
    - Create CheckpointUnlockedEvent with CheckpointId, TravelerId, and StoryChapterId
    - Create AccountLinkedEvent with TravelerId and PassportAccountId
    - Implement event dispatcher interface and base event class
    - _Requirements: 4.8, 15.8, 17.15_

  - [ ]* 5.2 Write unit tests for domain entities and value objects
    - Test QrCode validation (valid/invalid formats)
    - Test GeoCoordinate validation (latitude/longitude boundaries)
    - Test Traveler IsAnonymous and IsRegistered properties
    - Test Product activation state transitions
    - Test Stamp uniqueness constraint logic
    - _Requirements: 6.3, 7.4, 5.3, 5.4, 6.5, 8.11_

- [ ] 6. Database Schema and Migrations
  - [ ] 6.1 Create ApplicationDbContext with all entity configurations
    - Create ApplicationDbContext inheriting from DbContext
    - Configure DbSet properties for all 14 entities
    - Use OnModelCreating for explicit table/column mapping (snake_case convention)
    - Configure JSONB columns for Preferences, AnimationClips, UnlockCondition, ConditionValue
    - _Requirements: 11.1, 11.2_

  - [ ] 6.2 Create initial migration for all tables
    - Generate migration creating Travelers, PassportAccounts, Products, Characters tables
    - Generate migration creating StoryChapters, Checkpoints, CheckinRecords tables
    - Generate migration creating Stamps, Badges, TravelerBadges tables
    - Generate migration creating Partners, Vouchers, TravelerVouchers tables
    - Generate migration creating ChatSessions, ChatMessages tables
    - Generate migration creating Translations table with LanguageCode, ContentKey, ContentValue, unique constraint
    - _Requirements: 11.2, 11.3, 11.4_

  - [ ] 6.3 Configure database indexes for query performance
    - Add btree index on Traveler.AnonymousId
    - Add unique index on Product.QRCode
    - Add composite index on CheckinRecord(TravelerId, CheckinAt DESC)
    - Add index on Stamp.TravelerId
    - Add index on ChatSession.TravelerId
    - Add composite index on ChatMessage(SessionId, CreatedAt)
    - Add index on TravelerVoucher.RedemptionCode
    - Add spatial GIST index on Checkpoints using ll_to_earth(latitude, longitude) for PostGIS
    - Add unique composite index on CheckinRecord(TravelerId, CheckpointId, ClientGeneratedId) for idempotency
    - _Requirements: 11.12, 48.3, 48.4, 48.5_

  - [ ] 6.4 Create database seed data for initial testing
    - Seed 15 Checkpoint records for Hanoi region (VN-HN) with real GPS coordinates
    - Seed 1 Character record for Hanoi with sample animation clips
    - Seed 3 StoryChapter records linked to Hanoi checkpoints with unlock conditions
    - Seed 5 Badge definitions (Hanoi Explorer, Foodie, Culture Buff, Partner Patron, Week Warrior)
    - Seed 10 Partner businesses (5 restaurants, 3 hotels, 2 tour operators) with vouchers
    - Seed sample Product records with pre-generated QR codes
    - _Requirements: 11.8, 11.9, 11.10, 11.11_

  - [ ] 6.5 Configure Entity Framework Core migration auto-run on API startup
    - Modify Program.cs to run "dotnet ef database update" automatically on startup
    - Add error logging and non-zero exit on migration failure
    - Ensure migration completes within 30 seconds for empty database
    - _Requirements: 11.5, 11.6, 11.7_


- [ ] 7. Application Layer - Use Case Interfaces
  - [ ] 7.1 Define repository interfaces for data access
    - Create IProductRepository with methods: GetByQrCodeAsync, ActivateAsync, CreateAsync
    - Create ITravelerRepository with methods: GetByIdAsync, GetByAnonymousIdAsync, CreateAsync, UpdateAsync
    - Create ICheckpointRepository with methods: GetNearbyAsync, GetByIdAsync, GetAllAsync
    - Create ICheckinRecordRepository with methods: CreateBatchAsync, GetByTravelerIdAsync, ExistsAsync
    - Create IStampRepository with methods: CreateAsync, GetByTravelerIdAsync, ExistsAsync
    - Create IBadgeRepository with methods: GetAllAsync, GetByIdAsync
    - Create ITravelerBadgeRepository with methods: GetByTravelerIdAsync, CreateAsync, ExistsAsync
    - Create IPartnerRepository with methods: GetRecommendationsAsync, GetByIdAsync, CreateAsync, UpdateAsync
    - Create IVoucherRepository with methods: GetByPartnerIdAsync, GetByIdAsync, GetActiveAsync
    - Create ITravelerVoucherRepository with methods: CreateAsync, GetByTravelerIdAsync, GetByRedemptionCodeAsync
    - Create IChatSessionRepository with methods: GetByIdAsync, CreateAsync, UpdateAsync, GetByTravelerIdAsync
    - Create IChatMessageRepository with methods: CreateAsync, GetBySessionIdAsync
    - _Requirements: 4.9_

  - [ ] 7.2 Define service interfaces for business logic
    - Create IAiChatService with methods: SendMessageAsync, SummarizeConversationAsync
    - Create IAuthenticationService with methods: ValidateOAuthTokenAsync, GenerateJwtAsync, ValidateJwtAsync
    - Create ICheckpointService with methods: ValidateCheckinLocationAsync, CalculateDistanceAsync
    - Create IStoryUnlockService with methods: EvaluateUnlockConditionsAsync
    - Create IBadgeCalculationService with methods: EvaluateBadgeConditionsAsync
    - Create IVoucherService with methods: ClaimVoucherAsync, ValidateAvailabilityAsync
    - Create IGeolocationService with methods: CalculateDistance (haversine formula)
    - Create ITextToSpeechService with methods: GenerateAudioAsync
    - _Requirements: 4.9_

  - [ ] 7.3 Implement FluentValidation validators for API requests
    - Create ActivateProductRequestValidator (QrCode: NotEmpty, Length 16-32, Alphanumeric)
    - Create LinkAccountRequestValidator (OAuthProvider: Apple or Google, OAuthToken: NotEmpty)
    - Create ProcessCheckinBatchValidator (Checkins: NotEmpty, CheckpointId: Valid GUID, Coordinates: Valid range)
    - Create SendChatMessageValidator (Message or Audio: Required, SessionId: Optional GUID)
    - Create ClaimVoucherRequestValidator (VoucherId: Valid GUID)
    - _Requirements: Design section "Input Validation"_

- [ ] 8. Infrastructure Layer - Database Repositories
  - [ ] 8.1 Implement all repository interfaces using Entity Framework Core
    - Implement ProductRepository with EF Core queries
    - Implement TravelerRepository with EF Core queries
    - Implement CheckpointRepository with PostGIS spatial queries for GetNearbyAsync
    - Implement CheckinRecordRepository with batch insert optimization
    - Implement StampRepository with duplicate prevention
    - Implement BadgeRepository and TravelerBadgeRepository
    - Implement PartnerRepository with priority score ordering
    - Implement VoucherRepository with date range filtering
    - Implement TravelerVoucherRepository with redemption code generation
    - Implement ChatSessionRepository and ChatMessageRepository
    - Use AsNoTracking() for read-only queries
    - Use Include() for eager loading of related entities
    - _Requirements: 4.10, Design section "Query Optimization"_


- [ ] 9. Infrastructure Layer - External Service Integrations
  - [ ] 9.1 Implement Groq Cloud API integration for AI chat
    - Create GroqChatService implementing IAiChatService
    - Configure API endpoint: https://api.groq.com/v1/chat/completions
    - Use llama-3.1-8b-instant model for chat responses
    - Use llama-3-8b model for conversation summarization
    - Set timeout: 15 seconds for chat, 5 seconds for summarization
    - Parse action tags using regex: \[([A-Z_]+)\]
    - _Requirements: Design section "Groq Cloud API Integration"_

  - [ ] 9.2 Implement Azure Cognitive Services TTS integration
    - Create AzureTtsService implementing ITextToSpeechService
    - Configure API endpoint: https://{AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1
    - Use vi-VN-HoaiMyNeural for Vietnamese, en-US-JennyNeural for English
    - Generate SSML request format with prosody rate=+0%
    - Output format: audio-16khz-32kbitrate-mono-mp3
    - Upload audio files to Cloudflare R2 with 7-day lifecycle policy
    - Return CDN URL: https://r2.vitale.vn/audio/{sessionId}-{timestamp}-{hash}.mp3
    - _Requirements: Design section "Azure Cognitive Services TTS Integration"_

  - [ ] 9.3 Implement OAuth provider integration for Apple and Google Sign-In
    - Create AppleAuthProvider implementing IAuthenticationService for Apple token validation
    - Create GoogleAuthProvider implementing IAuthenticationService for Google token validation
    - Apple: Validate token with https://appleid.apple.com/auth/token, extract sub and email
    - Google: Validate token with https://oauth2.googleapis.com/tokeninfo?id_token={token}, extract sub and email
    - _Requirements: Design section "OAuth Provider Integration", 13.2, 13.3_

  - [ ] 9.4 Implement JWT generation and validation service
    - Create JwtService implementing IAuthenticationService
    - Use HS256 algorithm with JWT_SECRET from environment
    - Generate JWT with claims: TravelerId, Email, IsRegistered, IssuedAt, Expiration
    - Set expiration: 7 days from issuance
    - Implement token validation and refresh logic (30-day refresh window)
    - _Requirements: Design section "JWT Configuration", 13.10, 13.11, 13.12, 14.2, 14.3, 14.4_

  - [ ] 9.5 Implement Cloudflare R2 storage client for audio files
    - Configure AWS S3-compatible client for R2 endpoint
    - Implement upload method with 7-day lifecycle policy
    - Generate unique file names: audio/{sessionId}-{timestamp}-{hash}.mp3
    - Return public CDN URLs for audio playback
    - _Requirements: Design section "Audio File Handling"_

  - [ ] 9.6 Configure Serilog structured logging
    - Configure Serilog with JSON formatter for console output
    - Configure file output with daily rolling: /var/log/vitale/api.log
    - Set minimum level: Information (override Microsoft to Warning)
    - Enrich with machine name and environment name
    - Log request path, method, status code, duration, user ID, trace ID
    - _Requirements: Design section "Structured Logging (Serilog)"_


- [ ] 10. Application Layer - Core Use Cases
  - [ ] 10.1 Implement ActivateProduct use case
    - Validate QR code using QrCode value object
    - Look up Product by QRCode via IProductRepository
    - Return 404 if Product not found
    - Return 409 if Product.ActivatedAt is not null
    - Update Product.ActivatedAt to current UTC timestamp
    - Update Product.ActivatedByTravelerId to current Traveler.Id
    - Look up Character by Product.Region
    - Fire ProductActivatedEvent
    - Return Character with modelUrl and animationClips
    - Ensure atomic transaction
    - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10_

  - [ ] 10.2 Implement LinkAccount use case
    - Validate OAuth token with provider's endpoint (Apple or Google)
    - Extract user_id and email from token response
    - Return 401 if token is invalid
    - Check for existing PassportAccount with (OAuthProvider, OAuthUserId)
    - Return 409 if account already linked to another Traveler
    - Create new PassportAccount record
    - Update current Traveler.LinkedAccountId to reference new PassportAccount
    - Preserve all CheckinRecords, Stamps, TravelerBadges, TravelerVouchers
    - Generate JWT with TravelerId, Email, IsRegistered=true claims
    - Return JWT and traveler object
    - Ensure atomic transaction
    - _Requirements: 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 13.12, 13.13_

  - [ ] 10.3 Implement ProcessCheckinBatch use case
    - Validate checkins array is not empty (return 400 if empty)
    - For each checkin: validate CheckpointId exists, validate coordinates within radius
    - Skip invalid checkins and include in response.invalidCheckins array
    - Check for existing CheckinRecord with (TravelerId, CheckpointId, ClientGeneratedId)
    - Skip duplicates (idempotent behavior)
    - Insert new CheckinRecord with SyncStatus=Synced
    - Create corresponding Stamp record for each new checkin
    - Evaluate badge unlock conditions via IBadgeCalculationService
    - Evaluate story chapter unlock conditions via IStoryUnlockService
    - Fire CheckpointUnlockedEvent for newly unlocked stories
    - Return processedCount, skippedCount, newBadges, unlockedStories, invalidCheckins
    - Handle up to 50 checkins in a single request
    - Ensure transactional rollback on error
    - _Requirements: 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10, 17.11, 17.12, 17.13, 17.14, 17.15, 17.16, 17.17, 17.18, 17.19_

  - [ ] 10.4 Implement GetPassportStatus use case
    - Query all Stamps for current Traveler with Include(Checkpoint)
    - Query all TravelerBadges with Include(Badge)
    - Query all unlocked StoryChapters based on visited checkpoints
    - Calculate completion percentage per region: (visited / total) * 100
    - Return stamps array with checkpoint info (stampId, checkpointName, imageUrl, earnedAt)
    - Return badges array with badge info (badgeId, name, description, imageUrl, earnedAt)
    - Return unlockedStories array with chapter info (chapterId, title, contentKey, region)
    - Return regionProgress object mapping region codes to percentages
    - Return totalCheckpoints and visitedCheckpoints counts
    - Complete within 200ms for travelers with up to 100 stamps
    - _Requirements: 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11, 16.12_

  - [ ] 10.5 Implement SendChatMessage use case
    - Get or create ChatSession for current Traveler
    - Increment ChatSession.TurnCount
    - If audio provided, transcribe to text (placeholder for future ASR integration)
    - Build AI prompt context: current checkpoint name, visit history, unlocked stories, condensed context
    - Call Groq API via IAiChatService with prompt
    - Parse action tags from response text using regex
    - Generate TTS audio via ITextToSpeechService
    - Store ChatMessage with Role=User (input) and Role=Assistant (response)
    - Update ChatSession.LastMessageAt to current timestamp
    - Return response text, audioUrl, actionTags array, sessionId
    - _Requirements: 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 19.11, 19.12_


  - [ ] 10.6 Implement ClaimVoucher use case
    - Validate Voucher exists and IsActive=true (return 404 if not found)
    - Check ValidFrom <= current_time <= ValidUntil (return 400 if outside range)
    - Check MaxRedemptions not exceeded (return 409 if fully claimed)
    - Check Traveler hasn't already claimed this voucher (return 409 if duplicate)
    - Generate unique 8-character alphanumeric RedemptionCode
    - Create TravelerVoucher record with ClaimedAt=now, RedeemedAt=null
    - Return redemption code and voucher details
    - _Requirements: 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_

  - [ ] 10.7 Implement GetNearbyCheckpoints use case
    - Validate latitude and longitude parameters (return 400 if invalid)
    - Use PostGIS spatial query to find checkpoints within radius meters
    - Calculate distance for each checkpoint using haversine formula
    - Filter to only IsActive=true checkpoints
    - Order results by distance ascending (nearest first)
    - Join with Stamp to determine isVisited status for current Traveler
    - Return checkpoints array with checkpointId, name, latitude, longitude, distance, isVisited, storyChapterTitle, region
    - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_

  - [ ] 10.8 Implement GetPartnerRecommendations use case
    - Filter Partners by type if provided (Restaurant, Hotel, TourOperator, Museum, Shop)
    - Filter to IsActive=true partners
    - Calculate distance from user's (lat, lng) to each partner using haversine
    - Order by PriorityScore DESC, then distance ASC
    - Count available vouchers per partner (ValidFrom <= now <= ValidUntil, IsActive=true)
    - Return partners array with partnerId, name, type, address, latitude, longitude, distance, availableVouchers, priorityScore
    - _Requirements: Design section "Partner API"_

  - [ ] 10.9 Implement conversation summarization trigger
    - Check if ChatSession.TurnCount is multiple of 20 (20, 40, 60...)
    - Retrieve last 20 ChatMessages ordered by CreatedAt
    - Call Groq API with llama-3-8b model for summarization
    - Prompt: "Summarize this conversation history into key context in 150 tokens or less"
    - Store summary in ChatSession.CondensedContext
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 11. Checkpoint - Core Business Logic Complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 12. API Layer - Middleware Pipeline
  - [ ] 12.1 Implement authentication middleware for anonymous identity
    - Create middleware that reads vitale_session cookie
    - Generate new 12-character alphanumeric Anonymous_ID if no cookie present
    - Create new Traveler record with AnonymousId populated
    - Set HTTP-Only cookie: Domain=.vitale.vn, SameSite=Lax, Secure=true, Max-Age=31536000
    - Validate and extract Traveler.Id from cookie on subsequent requests
    - Generate new identity if Traveler.Id is invalid
    - Attach authenticated Traveler to HttpContext.Items
    - Execute within 5 milliseconds per request
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.11_

  - [ ] 12.2 Implement rate limiting middleware
    - Create in-memory cache for rate limit counters using MemoryCache
    - For /products/activate: limit by IP, 5 requests per 60 seconds
    - For /chat/message: limit by TravelerId, 20 per 60s (anonymous), 30 per 60s (registered)
    - For /checkins: limit by TravelerId, 10 requests per 60 seconds
    - For /vouchers/claim: limit by TravelerId, 5 requests per 60 seconds
    - For all other endpoints: 100 requests per 60 seconds per IP
    - Return HTTP 429 with Retry-After header when limit exceeded
    - _Requirements: Design section "Rate Limiting", 15.11, 19.13_

  - [ ] 12.3 Implement exception handling middleware
    - Create global try-catch middleware wrapping all requests
    - Log exceptions with stack trace, request path, user ID, trace ID
    - Return structured JSON error response: {error, errorCode, timestamp, traceId}
    - Map specific exceptions to HTTP status codes (404, 400, 409, 500)
    - Never expose internal exception details in production
    - _Requirements: Design section "Middleware Pipeline"_

  - [ ] 12.4 Configure CORS middleware for frontend access
    - Read CORS_ORIGINS from environment variable (comma-separated)
    - Allow origins: https://app.vitale.vn (production), http://localhost:3000 (development)
    - Set AllowCredentials=true for HTTP-Only cookie support
    - Allow all methods and headers
    - _Requirements: 39.1, 39.2, 39.3_

  - [ ] 12.5 Configure dependency injection in Program.cs
    - Register DbContext with PostgreSQL connection string from environment
    - Register all repository interfaces with their implementations (scoped lifetime)
    - Register all service interfaces with their implementations (scoped lifetime)
    - Register FluentValidation validators
    - Register middleware in correct order: Exception → CORS → Auth → RateLimit → MVC
    - _Requirements: 4.11, 4.12_


- [ ] 13. API Layer - Controllers and Endpoints
  - [ ] 13.1 Implement AuthController with account linking and token refresh
    - POST /api/v1/auth/link-account: Accept oAuthProvider and oAuthToken, call LinkAccount use case
    - Return 200 with JWT and traveler object on success
    - Return 401 for invalid OAuth token, 409 for account already linked
    - POST /api/v1/auth/refresh: Read JWT from cookie, validate signature
    - Issue new JWT with 7-day expiration if current token valid or expired within 30 days
    - Return 401 if token expired beyond 30 days or invalid signature
    - Complete refresh within 100 milliseconds
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.13, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

  - [ ] 13.2 Implement ProductsController with activation endpoint
    - POST /api/v1/products/activate: Accept qrCode, call ActivateProduct use case
    - Return 200 with travelerId and character object on success
    - Return 404 for product not found, 409 for already activated
    - Return 429 for rate limit exceeded (5 per 60s per IP)
    - Complete within 500 milliseconds
    - Ensure idempotent behavior
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.9, 15.11, 15.12_

  - [ ] 13.3 Implement PassportController with status endpoint
    - GET /api/v1/passport/me: Require authentication, call GetPassportStatus use case
    - Return 200 with stamps, badges, unlockedStories, regionProgress, totalCheckpoints, visitedCheckpoints
    - Complete within 200 milliseconds for travelers with up to 100 stamps
    - Return empty arrays for travelers with no progress
    - _Requirements: 16.1, 16.2, 16.6, 16.11, 16.12_

  - [ ] 13.4 Implement CheckinsController with batch submission endpoint
    - POST /api/v1/checkins: Accept checkins array, call ProcessCheckinBatch use case
    - Return 400 if checkins array is empty
    - Return 200 with processedCount, skippedCount, newBadges, unlockedStories, invalidCheckins
    - Handle up to 50 checkins per request
    - Complete within 2 seconds for 50 checkins
    - _Requirements: 17.1, 17.2, 17.3, 17.16, 17.17, 17.18_

  - [ ] 13.5 Implement CheckpointsController with nearby search endpoint
    - GET /api/v1/checkpoints/nearby: Accept lat, lng, radius query parameters
    - Return 400 for invalid latitude, longitude, or missing parameters
    - Call GetNearbyCheckpoints use case
    - Return 200 with checkpoints array ordered by distance
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.9_

  - [ ] 13.6 Implement ChatController with message submission endpoint
    - POST /api/v1/chat/message: Accept JSON body or multipart/form-data with audio
    - JSON body: {sessionId?, message, currentCheckpointId?}
    - Multipart: {sessionId?, audio: file, currentCheckpointId?}
    - Call SendChatMessage use case
    - Return 200 with text, audioUrl, actionTags array, sessionId
    - Return 429 for rate limit exceeded (20 per 60s anonymous, 30 per 60s registered)
    - Return 503 if AI service temporarily unavailable
    - _Requirements: 19.1, 19.2, 19.8, 19.12, 19.13, 19.14_

  - [ ] 13.7 Implement VouchersController with claim endpoint
    - POST /api/v1/vouchers/claim: Accept voucherId, call ClaimVoucher use case
    - Return 200 with redemptionCode and voucher details on success
    - Return 404 for voucher not found or inactive
    - Return 400 for voucher not yet valid or expired
    - Return 409 for voucher fully claimed or already claimed by user
    - _Requirements: 21.1, 21.2, 21.8, 21.9, 21.10, 21.11_

  - [ ] 13.8 Implement PartnersController with recommendations and admin endpoints
    - GET /api/v1/partners/recommendations: Accept type, lat, lng query parameters
    - Call GetPartnerRecommendations use case
    - Return 200 with partners array ordered by priority and distance
    - POST /api/v1/partners: Require admin authentication, accept partner data
    - Validate contactEmail format, latitude/longitude ranges
    - Create new Partner with IsActive=true
    - Return 201 with created partner object, 400 for validation errors
    - _Requirements: Design section "Partner API", 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_

  - [ ] 13.9 Implement HealthController with health check endpoint
    - GET /api/v1/health: Check database connectivity via simple query
    - Return 200 {status: "healthy"} if database reachable
    - Return 503 {status: "unhealthy", error} if database unreachable
    - _Requirements: 1.4_


- [ ] 14. Checkpoint - Backend API Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Frontend Foundation - Next.js PWA Setup
  - [ ] 15.1 Initialize Next.js 14+ project with App Router and TypeScript
    - Create Next.js project with TypeScript, ESLint, Tailwind CSS
    - Configure App Router with app/ directory structure
    - Set up next.config.js with output: 'export' for static site generation
    - Install and configure next-pwa or Workbox for service worker generation
    - Configure i18n support with next-intl for Vietnamese and English
    - _Requirements: 24.1, 24.2, 24.3_

  - [ ] 15.2 Create service worker configuration for offline-first caching
    - Configure Workbox caching strategies: Cache-first for app shell (HTML, CSS, JS)
    - Cache-first for 3D assets (.glb files) with cache on first access
    - Cache-first for images with network fallback
    - Network-first for API responses with cache fallback (stale-while-revalidate)
    - Network-only for API mutations (queued via Background Sync)
    - Configure background sync for 'sync-checkins' tag
    - Set maximum cache size: 50MB for assets with LRU eviction
    - _Requirements: Design section "Service Worker Strategy"_

  - [ ] 15.3 Set up IndexedDB schema for offline storage
    - Create IndexedDB database 'vitale_db' version 1
    - Create object store 'checkins_pending' with keyPath: clientGeneratedId
    - Add index on syncStatus (pending, synced, failed)
    - Create object store 'passport_cache' with keyPath: cacheKey
    - Create object store 'story_cache' with keyPath: chapterId
    - Request persistent storage via navigator.storage.persist()
    - _Requirements: Design section "Offline-First Storage Schema"_

  - [ ] 15.4 Implement API client with offline queue and sync worker
    - Create API client wrapper for all backend endpoints
    - Implement offline detection using navigator.onLine
    - Queue checkin requests in IndexedDB when offline
    - Register service worker sync event listener for 'sync-checkins'
    - POST pending checkins to /api/v1/checkins on sync event
    - Update IndexedDB syncStatus on success/failure
    - Implement exponential backoff retry: 30s, 60s, 120s (max 3 attempts)
    - _Requirements: Design section "Background Sync"_

  - [ ] 15.5 Set up i18n configuration and translation files
    - Configure next-intl with locales: ['en', 'vi']
    - Create locales/en.json with translations for common, passport, checkin, chat, partners sections
    - Create locales/vi.json with Vietnamese translations
    - Implement getLocale() function: priority localStorage > browser > default
    - Store selected language in localStorage as 'vitale_language'
    - _Requirements: Design section "Frontend i18n Implementation"_

  - [ ] 15.6 Implement global layout with navigation and offline indicator
    - Create app/layout.tsx with navigation menu
    - Add SyncStatusIndicator component showing "Offline - X checkins pending sync"
    - Add manual "Sync Now" button as fallback
    - Hide indicator when all checkins synced
    - Implement responsive navigation for mobile-first design
    - _Requirements: Design section "SyncStatusIndicator"_


- [ ] 16. Frontend - 3D Character Rendering
  - [ ] 16.1 Install and configure React Three Fiber and Drei helpers
    - Install @react-three/fiber, @react-three/drei, three
    - Configure TypeScript types for Three.js
    - Set up Canvas component with performance optimization settings
    - _Requirements: Design section "Technology Stack"_

  - [ ] 16.2 Implement CharacterViewer component with 3D model loading
    - Create CharacterViewer component accepting props: characterId, modelUrl, animationClips, playAnimation, isTalking
    - Use useGLTF hook to load GLB file from modelUrl
    - Display loading placeholder (simple 2D silhouette or spinner, <10KB) while loading
    - Implement OrbitControls for user interaction (rotate, zoom)
    - Target 30+ FPS on iPhone 12-class devices
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5_

  - [ ] 16.3 Implement character animation system with action tag support
    - Use useAnimations hook to load animation clips from GLB
    - Map action tags (WAVE, SMILE, NOD, POINT) to animation clip names from Character.AnimationClips
    - Implement playAnimation method triggered by action tags from AI responses
    - Queue animations when multiple tags received, play sequentially
    - Add visual indicator when character is "talking" (lip sync simulation or pulse effect)
    - Handle page visibility API for pause/resume when tab backgrounded
    - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6, 36.7, 36.8, 36.9, 36.10_

  - [ ] 16.4 Implement progressive loading for 3D assets
    - Load low-poly placeholder model immediately (<50KB)
    - Load high-poly model in background
    - Swap models when high-poly loads
    - Ensure smooth transition without jarring pop-in
    - _Requirements: Design section "3D Asset Optimization"_

- [ ] 17. Frontend - Core Pages and Components
  - [ ] 17.1 Create landing page (/) with platform information
    - Implement static landing page with SSG (pre-rendered)
    - Display information about ViTale platform value propositions
    - Add "Get Started" call-to-action button linking to /activate
    - Optimize for SEO with meta tags
    - _Requirements: Design section "Page Structure"_

  - [ ] 17.2 Create activation page (/activate) with QR code processing
    - Accept QR code from query parameter: ?code=XXX
    - Call POST /api/v1/products/activate with qrCode
    - Store returned travelerId in localStorage as "vitale_traveler_id"
    - Verify vitale_session cookie set by backend
    - Display 3D Character using CharacterViewer component
    - Show character name, region, and welcome message
    - Add "Start Journey" button navigating to /passport
    - Handle errors: 404 (product not found), 409 (already activated), 429 (rate limit)
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8_

  - [ ] 17.3 Create passport page (/passport) showing stamps, badges, and stories
    - Call GET /api/v1/passport/me on page load
    - Display StampCollection component with grid layout of earned stamps
    - Display BadgeGrid component with achievement cards
    - Display unlocked story chapters with read button
    - Show region progress bars with completion percentages
    - Show empty state for new users with encouraging message
    - Cache response in IndexedDB passport_cache for offline viewing
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_


  - [ ] 17.4 Create map page (/map) with interactive checkpoint markers
    - Integrate Mapbox GL JS or Leaflet for map rendering
    - Display custom markers for checkpoints: green for visited, gray for unvisited
    - Show current location indicator using Geolocation API
    - Implement marker click to view checkpoint details
    - Display "Check In" button when user within checkpoint radius
    - Call GET /api/v1/checkpoints/nearby every 30 seconds while map active
    - _Requirements: Design section "CheckpointMap", 37.2, 37.3_

  - [ ] 17.5 Create explore page (/explore) with list view of nearby checkpoints
    - Display list of nearby checkpoints sorted by distance
    - Show checkpoint name, distance, visited status
    - Filter by region or category
    - Implement search functionality
    - _Requirements: Design section "Page Structure"_

  - [ ] 17.6 Create chat page (/chat) with AI conversation interface
    - Implement ChatInterface component with message history
    - Add text input with send button
    - Add microphone button for voice input using MediaRecorder API
    - Display user and assistant messages with timestamps
    - Play TTS audio from audioUrl using HTML5 <audio> element
    - Trigger character animations based on actionTags array
    - Auto-scroll to latest message
    - Show loading indicator while waiting for response
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6, 35.7, 35.8, 35.9, 35.10, 35.11, 35.12, 35.13, 35.14, 35.15_

  - [ ] 17.7 Create partners page (/partners) with voucher browsing
    - Call GET /api/v1/partners/recommendations with optional type filter
    - Display partner cards with name, type, distance, available vouchers count
    - Implement filter by partner type (Restaurant, Hotel, TourOperator)
    - Show "Claim Voucher" button for each partner's active vouchers
    - Navigate to voucher claim flow on button click
    - _Requirements: Design section "Page Structure"_

  - [ ] 17.8 Create settings page (/settings) with account linking and preferences
    - Display current account status (anonymous or registered email)
    - Show AccountLinkPrompt modal if user is anonymous
    - Add language selection dropdown (English/Vietnamese)
    - Add "Delete My Data" button with confirmation dialog
    - Store preferences in localStorage and sync with backend
    - _Requirements: Design section "Page Structure"_

- [ ] 18. Frontend - Geolocation and Checkin Flow
  - [ ] 18.1 Implement geolocation tracking with permission handling
    - Request geolocation permission using navigator.geolocation.getCurrentPosition
    - Use watchPosition for continuous location tracking
    - Handle permission denied gracefully with message
    - Store permission state in localStorage to avoid repeated prompts
    - _Requirements: 37.1, 37.2_

  - [ ] 18.2 Implement checkin button trigger based on proximity
    - Calculate distance to each nearby checkpoint using haversine formula
    - Show "Check In" button when user within checkpoint radius
    - Disable button when outside radius
    - Display distance to checkpoint in real-time
    - _Requirements: 37.4, 37.5_

  - [ ] 18.3 Implement offline checkin creation and storage
    - Generate clientGeneratedId using UUID v4
    - Create checkin object: {checkpointId, checkinAt: ISO8601, clientGeneratedId, latitude, longitude}
    - Store in IndexedDB checkins_pending with syncStatus='pending'
    - Show confirmation message: "Saved offline, will sync later"
    - Update UI optimistically (show stamp immediately)
    - _Requirements: 37.6, 38.1, 38.2, 38.3_

  - [ ] 18.4 Implement online checkin with batch sync
    - When online, POST checkin batch to /api/v1/checkins
    - Include all pending checkins from IndexedDB
    - Update syncStatus to 'synced' on success
    - Handle newBadges and unlockedStories in response
    - Show celebration animation for new badges
    - _Requirements: 38.4, 38.5, 38.6, 38.7, 38.8_


- [ ] 19. Frontend - Account Linking and Authentication
  - [ ] 19.1 Implement AccountLinkPrompt modal component
    - Trigger modal on 5 stamps, badge earn, or voucher claim attempt
    - Display message encouraging account registration
    - Add "Link Apple Account" button using Apple JS SDK
    - Add "Link Google Account" button using Google Identity Services
    - Add "Maybe Later" dismissal storing 24-hour snooze in localStorage
    - _Requirements: 28.1, 28.2, 28.3, 28.4_

  - [ ] 19.2 Implement Apple Sign-In integration
    - Initialize Apple JS SDK with OAUTH_APPLE_CLIENT_ID
    - Configure redirect URI: https://app.vitale.vn/auth/callback/apple
    - Trigger Apple Sign-In flow on button click
    - Extract ID token from OAuth response
    - _Requirements: 28.5, 28.7_

  - [ ] 19.3 Implement Google Sign-In integration
    - Initialize Google Identity Services with OAUTH_GOOGLE_CLIENT_ID
    - Configure redirect URI: https://app.vitale.vn/auth/callback/google
    - Trigger Google Sign-In flow on button click
    - Extract ID token from OAuth response
    - _Requirements: 28.6, 28.7_

  - [ ] 19.4 Implement account linking API call flow
    - Call POST /api/v1/auth/link-account with {oAuthProvider, oAuthToken}
    - Handle success: store JWT in cookie (handled by backend)
    - Update UI to show registered status with user email
    - Handle 401 error: show "Authentication failed" message
    - Handle 409 error: show "This account is already linked to another user"
    - _Requirements: 28.8, 28.9, 28.10_

  - [ ] 19.5 Implement JWT refresh on app startup
    - On app initialization, check for vitale_session cookie
    - If present and close to expiration, call POST /api/v1/auth/refresh
    - Update cookie with new JWT
    - Handle 401 error: treat as logged out, allow anonymous browsing
    - _Requirements: 14.1, 14.2, 14.6_

- [ ] 20. Frontend - Voucher Claiming Flow
  - [ ] 20.1 Implement voucher claim button and confirmation dialog
    - Display voucher details: title, description, discount, valid until
    - Show "Claim" button for active vouchers
    - Display confirmation dialog before claiming
    - Disable button if user is anonymous and show account link prompt
    - _Requirements: Design section "VoucherService"_

  - [ ] 20.2 Implement claim API call and success display
    - Call POST /api/v1/vouchers/claim with voucherId
    - Handle success: display redemption code prominently
    - Save claimed voucher to passport_cache in IndexedDB
    - Show success message with instructions for redemption
    - Handle 404, 400, 409 errors with appropriate messages
    - _Requirements: 21.1, 21.8, 21.9, 21.10, 21.11_

- [ ] 21. Checkpoint - Frontend Core Features Complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 22. 3D Asset Pipeline and CDN Deployment
  - [ ] 22.1 Set up 3D asset directory structure
    - Create packages/assets-3d directory for source .glb files
    - Organize by character: packages/assets-3d/hanoi-princess/, packages/assets-3d/saigon-warrior/
    - Add .gitignore for large source files if necessary
    - _Requirements: 3.1_

  - [ ] 22.2 Create gltf-transform compression script
    - Install gltf-transform CLI tool
    - Create build script that compresses .glb files using draco and meshopt
    - Target 40%+ size reduction
    - Output compressed files to public/assets/characters/ directory
    - Generate hash-based version identifiers for cache busting
    - _Requirements: 3.2, 3.3_

  - [ ] 22.3 Configure GitHub Actions workflow for asset deployment
    - Create .github/workflows/deploy-assets.yml
    - Trigger on push to main when files in packages/assets-3d change
    - Run compression script
    - Upload compressed assets to Cloudflare CDN
    - Update asset URLs in database if needed
    - _Requirements: 3.4, 3.5_

  - [ ] 22.4 Optimize textures for 3D models
    - Convert textures to JPEG (quality 85%) or WebP format
    - Ensure character GLB files are under 500KB after compression
    - Test loading time on 4G connection (target: <3 seconds)
    - _Requirements: 3.7, 3.8, 3.9_

- [ ] 23. Performance Optimization and Monitoring
  - [ ] 23.1 Implement response caching headers on API endpoints
    - Add [ResponseCache] attribute to GET /checkpoints/nearby (5 minutes, Any)
    - Add [ResponseCache] attribute to GET /passport/me (1 minute, Client)
    - Configure Cloudflare CDN to respect Cache-Control headers
    - _Requirements: Design section "API Response Caching"_

  - [ ] 23.2 Configure Cloudflare CDN caching rules
    - Cache static assets for 1 year: .glb, .png, .jpg, .mp3, .woff2
    - Cache API GET requests: /checkpoints/nearby (5 min), /partners/recommendations (5 min)
    - Bypass cache for POST/PUT/DELETE and authenticated requests
    - Enable Brotli compression for JSON, HTML, CSS, JS
    - _Requirements: Design section "Cloudflare CDN Caching"_

  - [ ] 23.3 Implement frontend code splitting and lazy loading
    - Configure route-based code splitting for all pages
    - Lazy load CharacterViewer component with React.lazy
    - Lazy load heavy dependencies (Three.js, React Three Fiber)
    - Target initial JS bundle: <200KB gzipped
    - _Requirements: Design section "Code Splitting"_

  - [ ] 23.4 Optimize frontend images with Next.js Image component
    - Use next/image for all images with automatic WebP conversion
    - Configure responsive images based on viewport
    - Enable priority loading for above-the-fold images
    - Lazy load below-the-fold content
    - _Requirements: Design section "Image Optimization"_

  - [ ] 23.5 Set up health check monitoring with UptimeRobot
    - Configure UptimeRobot monitor for https://api.vitale.vn/health
    - Set check interval: 5 minutes
    - Configure alert email to admin@vitale.vn
    - Set alert criteria: 2 consecutive failures
    - _Requirements: Design section "External Monitoring (UptimeRobot)"_


- [ ] 24. Database Maintenance and Backup
  - [ ] 24.1 Create automated database backup script
    - Create /opt/vitale/backup.sh using pg_dump
    - Compress backup with gzip
    - Upload to Cloudflare R2 using AWS S3-compatible client
    - Delete local backups older than 7 days
    - Send email alert on failure
    - _Requirements: Design section "Automated Daily Backups"_

  - [ ] 24.2 Configure cron job for daily backups
    - Set cron schedule: 0 2 * * * (2 AM daily)
    - Log output to /var/log/vitale_backup.log
    - Configure R2 lifecycle rule: 30-day retention
    - _Requirements: Design section "Cron Schedule"_

  - [ ] 24.3 Create database maintenance scripts
    - Create script for weekly VACUUM ANALYZE
    - Create script for monthly REINDEX DATABASE
    - Create script for updating statistics
    - Schedule via cron
    - _Requirements: Design section "Routine Maintenance"_

- [ ] 25. Security Hardening
  - [ ] 25.1 Implement QR code generation endpoint with cryptographic security
    - POST /api/v1/admin/qr-generate: Require admin authentication
    - Generate 20-character alphanumeric QR codes using System.Security.Cryptography
    - Use character set: A-Z, a-z, 0-9 (62^20 possible combinations)
    - Create Product record with generated QR code
    - Return QR code and product ID
    - _Requirements: 40.1, 40.2, 40.3_

  - [ ] 25.2 Implement Content Security Policy headers
    - Configure CSP in Next.js to prevent XSS attacks
    - Allow scripts only from same origin and CDN
    - Allow styles from same origin and inline (for Tailwind)
    - Restrict frame-ancestors to prevent clickjacking
    - _Requirements: Design section "XSS Prevention"_

  - [ ] 25.3 Configure secrets management for production
    - Document all required environment variables in README
    - Use Docker secrets or VPS environment variables for production
    - Configure GitHub Secrets for CI/CD pipeline
    - Implement secret rotation schedule (90 days for JWT_SECRET, 180 days for API keys)
    - _Requirements: Design section "Secrets Management"_

  - [ ]* 25.4 Implement security audit logging
    - Log all authentication failures with IP address
    - Log rate limit violations
    - Log OAuth token validation attempts
    - Log admin actions (QR generation, partner creation)
    - Store in structured format for analysis
    - _Requirements: Design section "Key Metrics to Log"_


- [ ] 26. Testing Infrastructure
  - [ ]* 26.1 Set up unit testing framework with xUnit
    - Configure xUnit test projects for Domain, Application, Infrastructure, WebApi
    - Install FluentAssertions for readable assertions
    - Configure test coverage reporting with Coverlet
    - Target: 80%+ code coverage for Domain layer
    - _Requirements: Design section "Unit Tests"_

  - [ ]* 26.2 Set up integration testing with Testcontainers
    - Install Testcontainers.PostgreSQL package
    - Create IntegrationTestBase class with PostgreSQL container setup
    - Configure WebApplicationFactory for in-memory testing
    - Run migrations automatically before tests
    - Target: 30-40 integration tests covering all API endpoints
    - _Requirements: Design section "Integration Testing Strategy"_

  - [ ]* 26.3 Set up E2E testing with Playwright
    - Install Playwright with TypeScript support
    - Configure test browsers: Chromium, WebKit
    - Create E2E tests for: activation flow, passport view, checkin flow, offline sync, chat interface
    - Mock geolocation API for checkin tests
    - Mock OAuth flows for account linking tests
    - Target: <5 minutes total E2E runtime
    - _Requirements: Design section "End-to-End Testing Strategy", 47.1, 47.2, 47.3_

  - [ ]* 26.4 Configure CI/CD test pipeline
    - Create .github/workflows/ci.yml for pull requests
    - Run unit tests, integration tests, frontend build, lint
    - Fail if any test fails or code coverage drops below 70%
    - Run E2E tests in staging environment before production deploy
    - _Requirements: Design section "CI/CD Integration"_

- [ ] 27. Deployment and DevOps
  - [ ] 27.1 Create production deployment script
    - Create deploy.sh script for VPS deployment
    - Pull latest code from GitHub
    - Build Docker images
    - Run database migrations
    - Restart containers with zero downtime (blue-green strategy)
    - _Requirements: 1.9, 1.10_

  - [ ] 27.2 Deploy frontend to Cloudflare Pages
    - Configure Cloudflare Pages build settings
    - Set build command: npm run build
    - Set output directory: out/
    - Configure custom domain: app.vitale.vn
    - Enable automatic deployments on git push
    - _Requirements: 24.1_

  - [ ] 27.3 Configure environment variables on VPS
    - Set all required environment variables in .env file on VPS
    - Configure DB_CONNECTION_STRING, JWT_SECRET, GROQ_API_KEY
    - Configure AZURE_TTS_KEY, AZURE_TTS_REGION
    - Configure OAUTH_APPLE_CLIENT_ID, OAUTH_GOOGLE_CLIENT_ID
    - Configure CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY
    - Restart services after configuration
    - _Requirements: 42.1, 42.2, 42.3_

  - [ ] 27.4 Test production deployment end-to-end
    - Verify all services start correctly
    - Test health check endpoints
    - Test QR activation flow with real product
    - Test checkin flow with real GPS coordinates
    - Test chat flow with Groq API
    - Test account linking with Apple/Google
    - _Requirements: All requirements_


- [ ] 28. Final Integration and Documentation
  - [ ] 28.1 Create comprehensive README documentation
    - Document project structure and architecture overview
    - Document setup instructions for local development
    - Document environment variables and configuration
    - Document API endpoints with examples
    - Document deployment process
    - _Requirements: All requirements_

  - [ ] 28.2 Create API documentation with Swagger/OpenAPI
    - Install Swashbuckle.AspNetCore
    - Configure Swagger UI at /swagger endpoint
    - Document all API endpoints with request/response examples
    - Add authentication flow documentation
    - _Requirements: All API requirements_

  - [ ] 28.3 Create developer runbook for operations
    - Document backup and restore procedures
    - Document database migration rollback procedures
    - Document monitoring and alerting setup
    - Document troubleshooting common issues
    - Document secret rotation procedures
    - _Requirements: Design section "Database Backup Strategy", "Monitoring and Observability"_

  - [ ] 28.4 Perform final security audit
    - Review all authentication and authorization flows
    - Review all input validation and SQL injection prevention
    - Review CORS configuration
    - Review rate limiting rules
    - Review secrets management
    - Test against OWASP Top 10 vulnerabilities
    - _Requirements: Design section "Security Considerations"_

  - [ ] 28.5 Final checkpoint - Production readiness verification
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing and documentation tasks that can be skipped for faster MVP
- Each task references specific requirements from the requirements document for traceability
- Checkpoints ensure incremental validation and user feedback at key milestones
- The implementation follows Clean Architecture principles: Domain → Application → Infrastructure → API → Frontend
- Offline-first functionality is a core requirement, not optional
- All timestamps must be stored and transmitted in UTC format
- Security measures (rate limiting, input validation, authentication) are integrated throughout


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "2.1", "15.1", "22.1"]
    },
    {
      "id": 1,
      "tasks": ["1.3", "1.4", "2.2", "2.3", "3.1", "3.2", "3.3", "15.2", "15.3", "15.5", "22.2"]
    },
    {
      "id": 2,
      "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "5.1", "15.4", "16.1"]
    },
    {
      "id": 3,
      "tasks": ["5.2", "6.1", "6.2", "15.6", "16.2", "22.3"]
    },
    {
      "id": 4,
      "tasks": ["6.3", "6.4", "7.1", "7.2", "16.3", "16.4", "22.4"]
    },
    {
      "id": 5,
      "tasks": ["6.5", "7.3", "8.1", "17.1", "17.2"]
    },
    {
      "id": 6,
      "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "17.3", "17.4", "17.5"]
    },
    {
      "id": 7,
      "tasks": ["9.6", "10.1", "10.2", "10.3", "10.4", "17.6", "17.7", "17.8"]
    },
    {
      "id": 8,
      "tasks": ["10.5", "10.6", "10.7", "10.8", "10.9", "18.1", "18.2"]
    },
    {
      "id": 9,
      "tasks": ["12.1", "12.2", "12.3", "12.4", "18.3", "18.4"]
    },
    {
      "id": 10,
      "tasks": ["12.5", "13.1", "13.2", "13.3", "19.1", "19.2", "19.3"]
    },
    {
      "id": 11,
      "tasks": ["13.4", "13.5", "13.6", "13.7", "19.4", "19.5"]
    },
    {
      "id": 12,
      "tasks": ["13.8", "13.9", "20.1", "20.2"]
    },
    {
      "id": 13,
      "tasks": ["23.1", "23.2", "23.3", "23.4", "24.1"]
    },
    {
      "id": 14,
      "tasks": ["23.5", "24.2", "24.3", "25.1", "25.2"]
    },
    {
      "id": 15,
      "tasks": ["25.3", "25.4", "26.1", "26.2", "26.3"]
    },
    {
      "id": 16,
      "tasks": ["26.4", "27.1", "27.2", "27.3"]
    },
    {
      "id": 17,
      "tasks": ["27.4", "28.1", "28.2"]
    },
    {
      "id": 18,
      "tasks": ["28.3", "28.4"]
    }
  ]
}
```
