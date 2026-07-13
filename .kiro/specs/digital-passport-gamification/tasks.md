# Implementation Plan: Digital Passport Gamification Enhancement

## Overview

This implementation plan breaks down the Digital Passport Gamification Enhancement into discrete coding tasks for the ViTale platform. The feature integrates physical doll authentication, GPS-based check-ins, XP/leveling gamification, digital stamp collection, voucher rewards, and server-side journey card rendering with neumorphic UI components.

The implementation follows a layered approach:
1. **Foundation Layer** — Domain entities, database migrations, service interfaces
2. **Service Layer** — Token Service, Gamification Service, Check-in Service, Journey Card Renderer
3. **API Layer** — Controllers for admin token generation, check-ins, nearby checkpoints, gamification status
4. **Frontend Layer** — React components with neumorphic design and Framer Motion animations

## Tasks

- [x] 1. Set up foundation layer — entities, interfaces, and database migrations
  - [x] 1.1 Create DollToken entity with optimistic concurrency support
    - Create `backend/Domain/Entities/DollToken.cs` with all properties (Id, Token, DollId, UserId, GeneratedAt, ClaimedAt, ExpiresAt, IsUsed, UsedAt, RowVersion)
    - Implement `Claim(Guid userId)` and `MarkAsUsed()` methods with validation
    - Add EF Core configuration for RowVersion (timestamp)
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.3_
  
  - [x] 1.2 Create UserGamificationProfile entity with XP and level tracking
    - Create `backend/Domain/Entities/UserGamificationProfile.cs` with properties (Id, UserId, TotalXp, CurrentLevel, CheckinsCount, StampsUnlocked, BadgesEarned, CreatedAt, LastUpdatedAt, RowVersion)
    - Implement `AddXp(int xpAmount, XpSource source)` method
    - Implement `CheckLevelUp()` method using formula: 100 × L^1.5
    - Add navigation properties for Stamps, Badges, XpTransactions
    - _Requirements: 4.3, 4.4, 4.5, 4.6_
  
  - [x] 1.3 Create XpTransaction entity for XP audit trail
    - Create `backend/Domain/Entities/XpTransaction.cs` with properties (Id, UserId, Amount, Source, Timestamp)
    - Define XpSource enum (Checkin, LevelUp, Bonus, Admin)
    - _Requirements: 4.7_
  
  - [x] 1.4 Create UserStamp entity for digital stamp collection
    - Create `backend/Domain/Entities/UserStamp.cs` with properties (Id, UserId, CheckpointId, UnlockedAt)
    - Add unique constraint on (UserId, CheckpointId) to prevent duplicates
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 1.5 Update CheckinRecord entity with new fields
    - Add JourneyCardUrl, DollTokenId, and XpAwarded fields to existing CheckinRecord entity
    - Update constructor and SetJourneyCardUrl method
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_
  
  - [x] 1.6 Create EF Core database migrations for new entities
    - Create migration for DollToken table with RowVersion
    - Create migration for UserGamificationProfile table with RowVersion
    - Create migration for XpTransaction table
    - Create migration for UserStamp table with unique index
    - Create migration for CheckinRecord table alterations
    - _Requirements: 1.1, 2.3, 4.3, 5.1, 10.1_
  
  - [x] 1.7 Define service interfaces (ITokenService, IGamificationService, IJourneyCardRenderer)
    - Create `backend/Application/Interfaces/Services/ITokenService.cs` with ValidateTokenAsync, GenerateTokenForDollAsync, GetUserTokenInventoryAsync, RevokeTokenAsync
    - Create `backend/Application/Interfaces/Services/IGamificationService.cs` with AwardXpAsync, CheckAndProcessLevelUpAsync, UnlockDigitalStampAsync, GetUserGamificationStatusAsync
    - Create `backend/Application/Interfaces/Services/IJourneyCardRenderer.cs` with GenerateJourneyCardAsync, GetCachedJourneyCardUrlAsync, InvalidateJourneyCardCacheAsync
    - _Requirements: 1.1, 4.1, 7.1_
  
  - [x] 1.8 Create DTOs for requests and responses
    - Create `backend/Application/DTOs/Checkin/CheckinRequest.cs` (UserId, Latitude, Longitude, Accuracy, DollToken)
    - Create `backend/Application/DTOs/Checkin/CheckinResponse.cs` (Success, CheckpointId, CheckpointName, XpAwarded, CurrentLevel, TotalXp, JourneyCardUrl, NewStamps)
    - Create `backend/Application/DTOs/Tokens/GenerateTokenRequest.cs` and `GenerateTokenResponse.cs`
    - Create `backend/Application/DTOs/Gamification/GamificationStatusResponse.cs` (TotalXp, CurrentLevel, CheckinsCount, Stamps, Badges, NextLevelXp)
    - Create `backend/Application/DTOs/Checkpoints/NearbyCheckpointsRequest.cs` (Latitude, Longitude)
    - _Requirements: 17.4, 18.3, 19.2, 20.4_

- [ ] 2. Implement Token Engine Service
  - [ ] 2.1 Create TokenService with token generation logic
    - Create `backend/Infrastructure/Services/TokenService.cs` implementing ITokenService
    - Implement `GenerateSecureToken()` using cryptographically secure random (16 alphanumeric chars)
    - Implement `GenerateTokenForDollAsync(Guid dollId)` with 1-year expiry default
    - Add token uniqueness validation before persisting
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 18.3, 18.4_
  
  - [~] 2.2 Implement token validation with optimistic concurrency control
    - Implement `ValidateTokenAsync(string token, Guid userId)` in TokenService
    - Add expiry date validation
    - Add IsUsed validation
    - Implement token claiming with EF Core RowVersion for race condition protection
    - Handle DbUpdateConcurrencyException and return appropriate error messages
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 11.1, 11.2, 11.3, 11.4_
  
  - [~] 2.3 Write property test for token uniqueness (Property 1)
    - **Property 1: Token Uniqueness**
    - **Validates: Requirements 1.2**
    - Generate multiple tokens and verify no duplicates exist
    - Test with concurrent token generation
  
  - [~] 2.4 Write property test for single-use token invariant (Property 3)
    - **Property 3: Single-Use Token Invariant**
    - **Validates: Requirements 2.4, 2.5**
    - Verify each used token is associated with exactly one check-in record
    - Test concurrent claim attempts

- [ ] 3. Implement Gamification Engine Service
  - [~] 3.1 Create GamificationService with XP awarding logic
    - Create `backend/Infrastructure/Services/GamificationService.cs` implementing IGamificationService
    - Implement `AwardXpAsync(Guid userId, int xpAmount, XpSource source)` with optimistic concurrency retry
    - Add XpTransaction record creation
    - Ensure XP is always additive (never negative)
    - _Requirements: 4.1, 4.2, 4.3, 4.7_
  
  - [~] 3.2 Implement level-up calculation and reward distribution
    - Implement `CheckAndProcessLevelUpAsync(Guid userId)` using formula: max{L | TotalXP ≥ 100 × L^1.5}
    - Trigger voucher reward distribution on level-up
    - Return list of unlocked vouchers
    - _Requirements: 4.5, 4.6, 6.1, 6.2, 6.3_
  
  - [~] 3.3 Implement digital stamp unlocking with deduplication
    - Implement `UnlockDigitalStampAsync(Guid userId, Guid checkpointId)`
    - Check if stamp already exists for user-checkpoint pair
    - Create new UserStamp record only if not present
    - Record unlock timestamp
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [~] 3.4 Implement GetUserGamificationStatusAsync for profile retrieval
    - Query UserGamificationProfile, Stamps, Badges for given userId
    - Calculate next level XP using formula
    - Return comprehensive GamificationStatusResponse
    - _Requirements: 19.2, 19.3, 19.4_
  
  - [~] 3.5 Write property test for XP monotonicity (Property 2)
    - **Property 2: XP Monotonicity**
    - **Validates: Requirements 4.3, 4.4**
    - Generate sequence of XP awards and verify total XP never decreases
    - Test with concurrent XP additions
  
  - [~] 3.6 Write property test for level progression invariant (Property 5)
    - **Property 5: Level Progression Invariant**
    - **Validates: Requirements 4.5, 4.6**
    - For various XP values, verify level equals max{L | TotalXP ≥ 100 × L^1.5}
  
  - [~] 3.7 Write property test for XP award correctness (Property 6)
    - **Property 6: XP Award Correctness**
    - **Validates: Requirements 4.1, 4.2**
    - Verify 50 XP for standard check-ins, 150 XP for token check-ins
  
  - [~] 3.8 Write property test for stamp deduplication (Property 10)
    - **Property 10: Stamp Deduplication Invariant**
    - **Validates: Requirements 5.2, 5.3**
    - Attempt multiple unlocks for same checkpoint, verify only one stamp exists

- [~] 4. Checkpoint - Ensure foundation and services compile
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Check-in Service with GPS validation
  - [~] 5.1 Update CheckinService with Haversine distance calculation
    - Update `backend/Infrastructure/Services/CheckinService.cs`
    - Implement `CalculateHaversineDistance(GeoLocation loc1, GeoLocation loc2)` helper
    - Implement `GetNearbyCheckpointsAsync(GeoLocation location, double radiusMeters)` using Haversine
    - _Requirements: 3.1, 20.1, 20.2, 20.3_
  
  - [~] 5.2 Implement 50-meter radius validation and nearest checkpoint selection
    - Update `ProcessCheckinAsync` to filter checkpoints within 50 meters
    - Return error if no checkpoints within range
    - Select checkpoint with minimum distance if multiple found
    - _Requirements: 3.2, 3.3, 3.4, 12.1_
  
  - [~] 5.3 Integrate token validation into check-in flow
    - Call TokenService.ValidateTokenAsync if token provided
    - Return error if token validation fails
    - Pass dollId to check-in record creation
    - _Requirements: 2.1, 2.4, 12.2_
  
  - [~] 5.4 Orchestrate XP awarding and stamp unlocking during check-in
    - Call GamificationService.AwardXpAsync with correct amount (50 or 150)
    - Call GamificationService.CheckAndProcessLevelUpAsync
    - Call GamificationService.UnlockDigitalStampAsync
    - _Requirements: 4.1, 4.2, 4.6, 5.1_
  
  - [~] 5.5 Persist CheckinRecord with full metadata
    - Create CheckinRecord with all fields (GPS coords, accuracy, timestamp, XP, dollTokenId)
    - Save journey card URL after rendering completes
    - Use atomic transaction to ensure all-or-nothing persistence
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 15.4_
  
  - [~] 5.6 Write property test for location validation consistency (Property 4)
    - **Property 4: Location Validation Consistency**
    - **Validates: Requirements 3.2, 3.5**
    - For persisted check-ins, verify Haversine distance to checkpoint ≤ 50 meters
  
  - [~] 5.7 Write unit tests for GPS coordinate validation
    - Test latitude range validation ([-90, 90])
    - Test longitude range validation ([-180, 180])
    - Test invalid coordinate rejection
    - _Requirements: 3.5, 12.3_

- [ ] 6. Implement Journey Card Renderer with SkiaSharp
  - [~] 6.1 Create JourneyCardRenderer service with Redis caching
    - Create `backend/Infrastructure/Services/JourneyCardRenderer.cs` implementing IJourneyCardRenderer
    - Implement `GetCachedJourneyCardUrlAsync` checking Redis first (key: journey-card:{userId}:{ticks})
    - Implement cache invalidation method
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8_
  
  - [~] 6.2 Implement SkiaSharp rendering pipeline for 1080×1920 PNG
    - Implement `GenerateJourneyCardAsync(JourneyCardData data)` using SkiaSharp
    - Create SKImageInfo with dimensions 1080×1920
    - Encode as PNG with 90% quality
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [~] 6.3 Render journey card sections (header, XP, footer)
    - Implement RenderHeaderSection with traveler name and checkpoint name
    - Implement RenderXpProgress with current level, total XP, XP awarded
    - Implement RenderFooter with timestamp
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.8_
  
  - [~] 6.4 Render optional doll badge and GPS location
    - Implement RenderDollBadge (shown only when token used)
    - Include GPS coordinates on card
    - _Requirements: 8.3, 8.7_
  
  - [~] 6.5 Implement neumorphic background rendering
    - Create helper method for neumorphic shadow rendering
    - Apply soft shadows to background (no hard edges)
    - _Requirements: 8.9_
  
  - [~] 6.6 Integrate R2 Storage upload with local filesystem fallback
    - Implement R2 upload using Cloudflare R2 client (journey-cards/{userId}/{guid}.png)
    - Return public R2 URL on success
    - Implement fallback to local filesystem if R2 unavailable
    - _Requirements: 9.1, 9.2, 9.3, 13.1, 13.4_
  
  - [~] 6.7 Cache journey card URL in Redis with 24-hour TTL
    - After successful upload, cache URL in Redis
    - Set TTL to 24 hours
    - Skip caching if Redis unavailable (graceful degradation)
    - _Requirements: 9.4, 9.5, 13.4_
  
  - [~] 6.8 Write property test for journey card dimensions (Property 8)
    - **Property 8: Journey Card Dimensions Invariant**
    - **Validates: Requirements 7.2**
    - For various inputs, verify rendered image is always 1080×1920
  
  - [~] 6.9 Write property test for journey card content completeness (Property 7)
    - **Property 7: Journey Card Content Completeness**
    - **Validates: Requirements 8.1, 8.2, 8.4, 8.5, 8.6, 8.8**
    - Parse rendered PNG and verify all required text elements are present
  
  - [~] 6.10 Write property test for cache idempotence (Property 9)
    - **Property 9: Cache Idempotence**
    - **Validates: Requirements 9.4, 9.6, 9.7**
    - Retrieve same journey card URL multiple times, verify identical results

- [~] 7. Checkpoint - Verify check-in and rendering services
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Admin Token Generation API
  - [~] 8.1 Create AdminTokenController with POST /api/admin/tokens/generate endpoint
    - Create `backend/Api/Controllers/AdminTokenController.cs`
    - Add [Authorize(Roles = "Admin")] attribute
    - Implement POST endpoint accepting GenerateTokenRequest (dollId, optionally expiryDate)
    - Call TokenService.GenerateTokenForDollAsync
    - Return GenerateTokenResponse with 16-char token
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [~] 8.2 Write integration tests for admin token generation endpoint
    - Test successful token generation with admin auth
    - Test 401 Unauthorized without admin role
    - Test token format validation
    - _Requirements: 18.1, 18.2_

- [ ] 9. Implement Check-in API Controller
  - [~] 9.1 Create CheckinController with POST /api/checkin endpoint
    - Create `backend/Api/Controllers/CheckinController.cs` (if not exists, update existing)
    - Implement POST /api/checkin accepting CheckinRequest
    - Validate userId, latitude, longitude (required fields)
    - Call CheckinService.ProcessCheckinAsync
    - Return CheckinResponse with all fields
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  
  - [~] 9.2 Add error handling with appropriate HTTP status codes
    - Return 400 Bad Request for validation errors (missing fields, invalid coords)
    - Return 404 Not Found if no checkpoints within 50m
    - Return 500 Internal Server Error for unexpected failures
    - Include descriptive error messages in response
    - _Requirements: 17.5, 12.1, 12.2, 12.3_
  
  - [~] 9.3 Write integration tests for check-in endpoint
    - Test successful check-in without token
    - Test successful check-in with token (150 XP)
    - Test error: no checkpoints within 50m
    - Test error: invalid token
    - Test error: missing required fields
    - _Requirements: 17.1, 17.4, 17.5_

- [ ] 10. Implement Nearby Checkpoints API Controller
  - [~] 10.1 Create GET /api/checkpoints/nearby endpoint
    - Update `backend/Api/Controllers/CheckpointController.cs` (or create if not exists)
    - Implement GET /api/checkpoints/nearby with query params (latitude, longitude)
    - Call CheckinService.GetNearbyCheckpointsAsync with 50m radius
    - Return list of NearbyCheckpointDto ordered by distance ascending
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [~] 10.2 Write integration tests for nearby checkpoints endpoint
    - Test returning checkpoints within 50m
    - Test empty list when no checkpoints nearby
    - Test distance ordering (closest first)
    - _Requirements: 20.3, 20.4, 20.5_

- [ ] 11. Implement Gamification Status API Controller
  - [~] 11.1 Create GET /api/gamification/status endpoint
    - Create `backend/Api/Controllers/GamificationController.cs`
    - Implement GET /api/gamification/status for authenticated user
    - Call GamificationService.GetUserGamificationStatusAsync
    - Return GamificationStatusResponse with XP, level, stamps, badges, next level XP
    - _Requirements: 19.1, 19.2, 19.3, 19.4_
  
  - [~] 11.2 Write integration tests for gamification status endpoint
    - Test retrieving status for user with check-ins
    - Test retrieving status for new user (no check-ins)
    - Test stamps list inclusion
    - _Requirements: 19.2, 19.3, 19.4_

- [~] 12. Checkpoint - Verify all backend APIs work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement React NeumorphicStamp component with animations
  - [~] 13.1 Create NeumorphicStamp React component
    - Create `frontend/src/components/passport/NeumorphicStamp.tsx`
    - Use CSS box-shadow for soft 3D neumorphic effect (no animation on shadows)
    - Add Framer Motion scale animation for new stamps (initial scale 0 → 1, spring transition)
    - Add pressed state with inset shadow on tap
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [~] 13.2 Write unit tests for NeumorphicStamp component
    - Test rendering with stamp data
    - Test new stamp animation triggers
    - Test pressed state on tap
    - _Requirements: 14.1, 14.2, 14.3_

- [ ] 14. Implement XP/Level Progress Bar component
  - [~] 14.1 Create ProgressBar React component for XP tracking
    - Create `frontend/src/components/passport/XpProgressBar.tsx`
    - Display current XP, level, and progress to next level as percentage
    - Use neumorphic styling for progress bar
    - _Requirements: 14.5_
  
  - [~] 14.2 Write unit tests for XpProgressBar component
    - Test progress calculation correctness
    - Test display of current level and XP
    - _Requirements: 14.5_

- [ ] 15. Integrate passport screen with gamification components
  - [~] 15.1 Update PassportScreen to display stamps, XP, and level
    - Update `frontend/src/screens/PassportScreen.tsx` (or equivalent)
    - Fetch gamification status via GET /api/gamification/status
    - Render list of NeumorphicStamp components
    - Render XpProgressBar with current stats
    - _Requirements: 14.1, 14.5_
  
  - [~] 15.2 Add check-in flow to mobile app
    - Update check-in screen to call POST /api/checkin with GPS coords and optional token
    - Display journey card image on successful check-in
    - Trigger stamp unlock animation when new stamps received
    - _Requirements: 17.4, 14.2_
  
  - [~] 15.3 Write integration tests for passport screen
    - Test stamps rendering after check-in
    - Test XP/level display updates
    - Test journey card display
    - _Requirements: 14.1, 14.5, 17.4_

- [~] 16. Final checkpoint - End-to-end system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Foundation tasks (entities, migrations, interfaces) must complete before service implementations
- Service implementations must complete before API controllers
- API controllers must complete before frontend integration
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation at key milestones
- The implementation uses existing ViTale infrastructure (EF Core, ASP.NET Core, React) to minimize setup time

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.5", "1.6", "1.7", "1.8"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "3.3"] },
    { "id": 4, "tasks": ["2.3", "2.4", "3.4", "3.5", "3.6", "3.7", "3.8"] },
    { "id": 5, "tasks": ["5.1", "5.2"] },
    { "id": 6, "tasks": ["5.3", "5.4", "6.1", "6.2"] },
    { "id": 7, "tasks": ["5.5", "6.3", "6.4", "6.5"] },
    { "id": 8, "tasks": ["5.6", "5.7", "6.6", "6.7"] },
    { "id": 9, "tasks": ["6.8", "6.9", "6.10", "8.1"] },
    { "id": 10, "tasks": ["8.2", "9.1", "10.1", "11.1"] },
    { "id": 11, "tasks": ["9.2", "9.3", "10.2", "11.2"] },
    { "id": 12, "tasks": ["13.1", "14.1"] },
    { "id": 13, "tasks": ["13.2", "14.2", "15.1"] },
    { "id": 14, "tasks": ["15.2", "15.3"] }
  ]
}
```
