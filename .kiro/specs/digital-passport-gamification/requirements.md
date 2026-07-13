# Requirements Document

## Introduction

This document specifies the formal requirements for the ViTale Digital Passport Gamification Enhancement feature. The system integrates physical doll authentication, GPS-based check-ins, gamification mechanics (XP, levels, digital stamps, vouchers), and server-side journey card rendering. The requirements are derived from the approved design document and follow the EARS (Easy Approach to Requirements Syntax) pattern for clarity and testability.

The feature enhances the existing ViTale passport system by adding: (1) Token Engine for physical doll authentication with race condition protection, (2) Simplified GPS Check-in with 50-meter location validation, (3) XP-based leveling system with exponential progression curve, (4) Digital stamp unlocking and voucher rewards, and (5) Server-side journey card rendering using SkiaSharp with R2 storage and Redis caching.

## Glossary

- **System**: The ViTale Digital Passport Gamification Enhancement backend services
- **Token_Service**: Component responsible for generating, validating, and managing doll authentication tokens
- **Checkin_Service**: Component responsible for processing location-based check-ins and GPS validation
- **Gamification_Service**: Component responsible for XP awarding, level calculations, and rewards
- **Journey_Card_Renderer**: Component responsible for server-side image generation using SkiaSharp
- **Doll_Token**: A 16-character alphanumeric authentication token associated with a physical doll
- **Checkpoint**: A geographic location where travelers can check in
- **Check-in**: The act of recording a traveler's presence at a checkpoint via GPS coordinates
- **XP**: Experience Points awarded to travelers for completing check-ins
- **Digital_Stamp**: A virtual collectible unlocked when a traveler checks into a checkpoint
- **Journey_Card**: A server-rendered 1080x1920 PNG image summarizing a check-in with neumorphic design
- **User_Location**: GPS coordinates (latitude, longitude) from the mobile device
- **R2_Storage**: Cloudflare R2 object storage for journey card images
- **Redis_Cache**: In-memory cache for journey card URLs with time-to-live (TTL)

## Requirements

### Requirement 1: Doll Token Management

**User Story:** As a system administrator, I want to generate and manage unique authentication tokens for physical dolls, so that travelers can verify doll ownership during check-ins.

#### Acceptance Criteria

1. THE Token_Service SHALL generate doll tokens that are exactly 16 alphanumeric characters
2. WHEN generating a new doll token, THE Token_Service SHALL ensure the token is globally unique across all existing tokens
3. WHEN a token is generated, THE Token_Service SHALL use a cryptographically secure random number generator
4. WHEN a token expiry date is reached, THE Token_Service SHALL reject validation attempts for that token
5. THE Token_Service SHALL associate each generated token with exactly one doll identifier

---

### Requirement 2: Token Lifecycle and Concurrency Control

**User Story:** As a traveler, I want to claim and use my doll token only once, so that the token cannot be reused or stolen by others.

#### Acceptance Criteria

1. WHEN a traveler claims a doll token, THE Token_Service SHALL mark the token as claimed and associate it with the traveler's user ID
2. IF a token is already claimed, THEN THE Token_Service SHALL reject subsequent claim attempts with an error message
3. WHEN two travelers attempt to claim the same token simultaneously, THE Token_Service SHALL use optimistic concurrency control to ensure exactly one claim succeeds
4. WHEN a token is used for a check-in, THE Token_Service SHALL mark the token as used and record the usage timestamp
5. IF a token is already marked as used, THEN THE Token_Service SHALL reject subsequent usage attempts
6. WHEN a token revocation is requested, THE Token_Service SHALL invalidate the token and prevent further usage

---

### Requirement 3: GPS Location Validation for Check-ins

**User Story:** As a traveler, I want to check in at nearby checkpoints using my GPS location, so that I can collect digital stamps and earn XP.

#### Acceptance Criteria

1. WHEN a traveler submits a check-in request with GPS coordinates, THE Checkin_Service SHALL calculate the distance to all checkpoints using the Haversine formula
2. THE Checkin_Service SHALL only allow check-ins when the traveler is within 50 meters of at least one checkpoint
3. IF no checkpoints are within 50 meters, THEN THE Checkin_Service SHALL reject the check-in with an appropriate error message
4. WHEN multiple checkpoints are within 50 meters, THE Checkin_Service SHALL select the checkpoint with the minimum distance to the traveler
5. WHEN a check-in is successfully processed, THE Checkin_Service SHALL record the GPS coordinates with latitude, longitude, and accuracy

---

### Requirement 4: XP Awarding and Leveling

**User Story:** As a traveler, I want to earn experience points (XP) for check-ins and level up as I explore, so that I feel a sense of progression and achievement.

#### Acceptance Criteria

1. WHEN a traveler completes a standard check-in without a doll token, THE Gamification_Service SHALL award exactly 50 XP
2. WHEN a traveler completes a check-in with a valid doll token, THE Gamification_Service SHALL award exactly 150 XP (50 base + 100 bonus)
3. WHEN XP is awarded to a traveler, THE Gamification_Service SHALL add the XP amount to the traveler's total XP
4. THE Gamification_Service SHALL ensure that a traveler's total XP never decreases
5. WHEN calculating a traveler's level, THE Gamification_Service SHALL use the formula: Level = max{L | TotalXP ≥ 100 × L^1.5}
6. WHEN a traveler's XP crosses a level threshold, THE Gamification_Service SHALL increment the traveler's level and trigger reward distribution
7. THE Gamification_Service SHALL record each XP transaction with the amount, source, and timestamp

---

### Requirement 5: Digital Stamp Unlocking

**User Story:** As a traveler, I want to unlock digital stamps for each checkpoint I visit, so that I can build a collection representing my journey.

#### Acceptance Criteria

1. WHEN a check-in is successfully processed, THE Gamification_Service SHALL unlock the digital stamp associated with the checkpoint
2. THE Gamification_Service SHALL add the unlocked stamp to the traveler's stamp collection if not already present
3. IF a traveler has already unlocked a stamp for a checkpoint, THEN THE Gamification_Service SHALL not create a duplicate stamp record
4. THE Gamification_Service SHALL record the timestamp when each stamp is unlocked

---

### Requirement 6: Voucher Reward System

**User Story:** As a traveler, I want to receive voucher rewards when I level up, so that I am incentivized to explore more checkpoints.

#### Acceptance Criteria

1. WHEN a traveler levels up, THE Gamification_Service SHALL determine the appropriate voucher rewards for the new level
2. WHEN voucher rewards are determined, THE Gamification_Service SHALL add the vouchers to the traveler's inventory
3. THE Gamification_Service SHALL record the level at which each voucher was awarded

---

### Requirement 7: Journey Card Generation - Dimensions and Format

**User Story:** As a traveler, I want to receive a visually appealing journey card after each check-in, so that I can share my experience on social media.

#### Acceptance Criteria

1. WHEN a check-in is successfully processed, THE Journey_Card_Renderer SHALL generate a journey card image
2. THE Journey_Card_Renderer SHALL render journey cards with dimensions of exactly 1080 pixels width by 1920 pixels height
3. THE Journey_Card_Renderer SHALL encode journey cards in PNG format with 90% quality
4. THE Journey_Card_Renderer SHALL use SkiaSharp library for server-side graphics rendering

---

### Requirement 8: Journey Card Content and Rendering

**User Story:** As a traveler, I want my journey card to display my check-in details, XP progress, and doll information, so that the card is personalized and informative.

#### Acceptance Criteria

1. WHEN rendering a journey card, THE Journey_Card_Renderer SHALL include the traveler's name in the header section
2. WHEN rendering a journey card, THE Journey_Card_Renderer SHALL include the checkpoint name in the header section
3. WHEN rendering a journey card, THE Journey_Card_Renderer SHALL include the GPS location coordinates on the card
4. WHEN rendering a journey card, THE Journey_Card_Renderer SHALL include the XP amount awarded for the check-in
5. WHEN rendering a journey card, THE Journey_Card_Renderer SHALL include the traveler's current level
6. WHEN rendering a journey card, THE Journey_Card_Renderer SHALL include the traveler's total XP
7. WHEN a check-in includes a doll token, THE Journey_Card_Renderer SHALL include the doll name in a badge section
8. WHEN rendering a journey card, THE Journey_Card_Renderer SHALL include the check-in timestamp in the footer section
9. THE Journey_Card_Renderer SHALL apply neumorphic design styling to journey card backgrounds

---

### Requirement 9: Journey Card Storage and Caching

**User Story:** As a system operator, I want journey cards to be stored reliably and cached efficiently, so that travelers can quickly access their cards and reduce server load.

#### Acceptance Criteria

1. WHEN a journey card is rendered, THE Journey_Card_Renderer SHALL upload the PNG image to R2_Storage
2. WHEN uploading to R2_Storage, THE Journey_Card_Renderer SHALL use a file path format of journey-cards/{userId}/{guid}.png
3. WHEN a journey card is successfully uploaded, THE Journey_Card_Renderer SHALL return the public R2 URL
4. WHEN a journey card URL is generated, THE Journey_Card_Renderer SHALL cache the URL in Redis_Cache with a key format of journey-card:{userId}:{checkinTimestamp}
5. THE Journey_Card_Renderer SHALL set a 24-hour TTL (time-to-live) for cached journey card URLs in Redis_Cache
6. WHEN a journey card request is received, THE Journey_Card_Renderer SHALL check Redis_Cache first before rendering
7. IF a cached journey card URL is found, THEN THE Journey_Card_Renderer SHALL return the cached URL without re-rendering
8. WHEN a cache invalidation is requested, THE Journey_Card_Renderer SHALL remove the corresponding entry from Redis_Cache

---

### Requirement 10: Check-in Record Persistence

**User Story:** As a system administrator, I want all check-ins to be recorded with complete metadata, so that we can audit traveler activity and generate analytics.

#### Acceptance Criteria

1. WHEN a check-in is successfully processed, THE Checkin_Service SHALL create a check-in record in the database
2. THE Checkin_Service SHALL record the user ID in the check-in record
3. THE Checkin_Service SHALL record the checkpoint ID in the check-in record
4. THE Checkin_Service SHALL record the GPS latitude and longitude in the check-in record
5. THE Checkin_Service SHALL record the GPS accuracy (if available) in the check-in record
6. THE Checkin_Service SHALL record the check-in timestamp in the check-in record
7. THE Checkin_Service SHALL record the journey card URL in the check-in record after rendering completes
8. IF a doll token was used, THEN THE Checkin_Service SHALL record the doll token ID in the check-in record
9. THE Checkin_Service SHALL record the XP amount awarded in the check-in record

---

### Requirement 11: Error Handling for Token Operations

**User Story:** As a traveler, I want clear error messages when token operations fail, so that I understand what went wrong and can take corrective action.

#### Acceptance Criteria

1. IF a token is not found in the database, THEN THE Token_Service SHALL return an error message stating "Token not found or expired"
2. IF a token has expired, THEN THE Token_Service SHALL return an error message stating "Token not found or expired"
3. IF a token is already used, THEN THE Token_Service SHALL return an error message stating "Token already used"
4. IF a concurrency conflict occurs during token claiming, THEN THE Token_Service SHALL return an error message stating "Token already claimed by another user"
5. IF a token format is invalid, THEN THE Token_Service SHALL return an error message describing the format requirements

---

### Requirement 12: Error Handling for Check-in Operations

**User Story:** As a traveler, I want clear error messages when check-ins fail, so that I understand location requirements and token issues.

#### Acceptance Criteria

1. IF no checkpoints are within 50 meters of the traveler's location, THEN THE Checkin_Service SHALL return an error message stating "No checkpoints within 50 meters"
2. IF an invalid doll token is provided, THEN THE Checkin_Service SHALL return an error message prefixed with "Invalid token: " followed by the token validation error
3. IF GPS coordinates are outside valid ranges, THEN THE Checkin_Service SHALL reject the request with an error message

---

### Requirement 13: Journey Card Error Handling and Fallback

**User Story:** As a system operator, I want journey card rendering to degrade gracefully when services are unavailable, so that check-ins can still be processed.

#### Acceptance Criteria

1. IF R2_Storage is unavailable, THEN THE Journey_Card_Renderer SHALL fall back to local filesystem storage
2. IF SkiaSharp rendering fails, THEN THE Journey_Card_Renderer SHALL use a pre-rendered template with text overlay
3. WHEN an error occurs during journey card rendering, THE Journey_Card_Renderer SHALL log the error with full context
4. IF Redis_Cache is unavailable, THEN THE Journey_Card_Renderer SHALL skip caching and proceed with rendering

---

### Requirement 14: Neumorphic UI Components (Frontend)

**User Story:** As a traveler, I want a visually premium passport interface with smooth animations, so that the app feels polished and engaging.

#### Acceptance Criteria

1. WHEN the passport screen is displayed, THE client application SHALL render digital stamps using neumorphic design patterns with soft shadows
2. WHEN a new stamp is unlocked, THE client application SHALL display a Framer Motion animation with scale effect
3. WHEN a traveler taps a stamp, THE client application SHALL show a pressed state with inset shadow effect
4. THE client application SHALL use box-shadow CSS properties to create neumorphic 3D effects without animating the shadows
5. THE client application SHALL display the traveler's current XP, level, and progress to next level on the passport screen

---

### Requirement 15: Data Integrity and Consistency

**User Story:** As a system administrator, I want the gamification system to maintain data integrity under concurrent operations, so that traveler progress is accurate and reliable.

#### Acceptance Criteria

1. WHEN concurrent check-ins are processed for the same traveler, THE Gamification_Service SHALL use optimistic concurrency control to ensure XP updates are not lost
2. THE System SHALL use database row versioning (RowVersion byte array) for entities with concurrent update risk
3. WHEN a database concurrency conflict is detected, THE System SHALL retry the operation with updated data
4. THE System SHALL ensure that all check-in operations are atomic (all steps succeed or all steps roll back)

---

### Requirement 16: Performance and Scalability

**User Story:** As a system operator, I want the gamification system to perform efficiently under load, so that travelers experience minimal latency during check-ins.

#### Acceptance Criteria

1. WHEN generating a journey card, THE Journey_Card_Renderer SHALL complete rendering in under 3 seconds for 95% of requests
2. WHEN checking the cache for a journey card, THE Journey_Card_Renderer SHALL retrieve the cached URL in under 50 milliseconds
3. WHEN calculating distances for nearby checkpoints, THE Checkin_Service SHALL use efficient spatial queries to minimize database load
4. THE System SHALL support at least 100 concurrent check-in requests without performance degradation

---

### Requirement 17: API Contract for Check-in Endpoint

**User Story:** As a mobile application developer, I want a clear API contract for the check-in endpoint, so that I can integrate the gamification features correctly.

#### Acceptance Criteria

1. THE System SHALL expose a POST endpoint at /api/checkin for processing check-ins
2. WHEN the check-in endpoint receives a request, THE System SHALL validate that the request includes userId, latitude, and longitude
3. WHEN the check-in endpoint receives a request with a doll token, THE System SHALL validate the token before processing the check-in
4. WHEN a check-in succeeds, THE System SHALL return a response including checkpointId, checkpointName, xpAwarded, currentLevel, totalXp, journeyCardUrl, and newStamps
5. WHEN a check-in fails, THE System SHALL return an appropriate HTTP status code (400 for validation errors, 404 for not found, 500 for server errors) with a descriptive error message

---

### Requirement 18: Token Generation API

**User Story:** As a system administrator, I want an API to generate tokens for new physical dolls, so that I can associate tokens with products during inventory management.

#### Acceptance Criteria

1. THE System SHALL expose a POST endpoint at /api/admin/tokens/generate for generating doll tokens
2. WHEN the token generation endpoint is called, THE System SHALL require administrator authentication
3. WHEN generating a token, THE System SHALL accept a dollId parameter and return the generated 16-character token
4. THE System SHALL set a default expiry date of 1 year from generation for new tokens

---

### Requirement 19: User Gamification Status Query

**User Story:** As a traveler, I want to view my complete gamification profile, so that I can track my XP, level, stamps, and rewards.

#### Acceptance Criteria

1. THE System SHALL expose a GET endpoint at /api/gamification/status for retrieving a traveler's gamification profile
2. WHEN the gamification status endpoint is called, THE System SHALL return the traveler's total XP, current level, check-in count, stamps unlocked count, and badges earned count
3. WHEN the gamification status endpoint is called, THE System SHALL include a list of all unlocked stamps with their checkpoint names and unlock timestamps
4. WHEN the gamification status endpoint is called, THE System SHALL include the XP required for the next level

---

### Requirement 20: Nearby Checkpoints Query

**User Story:** As a traveler, I want to see which checkpoints are near my current location, so that I know where to go for my next check-in.

#### Acceptance Criteria

1. THE System SHALL expose a GET endpoint at /api/checkpoints/nearby for querying nearby checkpoints
2. WHEN the nearby checkpoints endpoint receives a request, THE System SHALL require latitude and longitude query parameters
3. WHEN the nearby checkpoints endpoint receives a request, THE System SHALL return all checkpoints within 50 meters of the provided location
4. WHEN returning nearby checkpoints, THE System SHALL include the checkpoint ID, name, GPS coordinates, and distance in meters from the traveler's location
5. THE System SHALL order nearby checkpoints by distance in ascending order (closest first)
