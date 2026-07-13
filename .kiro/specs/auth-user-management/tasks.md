# Implementation Plan: Authentication & User Management System

## Overview

This implementation plan executes the authentication and user management system using a phased approach. Phase 1 establishes the database schema and core service infrastructure. Phase 2 implements authentication flows (registration, login, logout, token refresh). Phase 3 adds OAuth and passwordless authentication. Phase 4 implements session management and security features. Phase 5 builds admin capabilities. Each phase includes property-based tests for core validation and security logic.

## Tasks

- [ ] 1. Database Schema Setup and Entity Framework Models
  - [-] 1.1 Create database migration for user_profiles table in gateway schema
    - Add migration file to EF Core migrations
    - Create table with all columns: id, user_id (FK), display_name, avatar_url, date_of_birth, address, role, status, last_login_at, deleted_at, created_at, updated_at
    - Add unique constraint on user_id, indexes on user_id, role, status
    - _Requirements: 1.2, 1.5_
  
  - [-] 1.2 Create database migration for user_sessions table in gateway schema
    - Add migration file to EF Core migrations
    - Create table with columns: id, user_id (FK), refresh_token_hash, ip_address, user_agent, device_fingerprint, expires_at, created_at
    - Add indexes on user_id, refresh_token_hash, expires_at
    - _Requirements: 1.3, 1.6_
  
  - [ ] 1.3 Create database migration for admin_logs table in gateway schema
    - Add migration file to EF Core migrations
    - Create table with columns: id, admin_user_id (FK), action, target_resource, details (jsonb), ip_address, created_at
    - Add indexes on admin_user_id, created_at, action
    - _Requirements: 1.4, 1.7_
  
  - [~] 1.4 Create EF Core entity models for all three tables
    - Create UserProfile entity with all properties and data annotations
    - Create UserSession entity with all properties
    - Create AdminLog entity with all properties
    - Define relationships and constraints in entity configuration
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ]* 1.5 Write unit tests for database schema
    - Test EF Core model mapping and table creation
    - Test foreign key relationships and cascade delete
    - _Requirements: 1.8, 1.9_

- [ ] 2. Core Authentication Services Infrastructure
  - [~] 2.1 Create DTO models for authentication requests/responses
    - Create LoginRequest, RegisterRequest, AuthResponse, RefreshTokenRequest, PasswordResetRequest, OtpRequest classes
    - Add data annotations for validation
    - _Requirements: 2.1, 4.1_
  
  - [~] 2.2 Implement TokenService for JWT generation and validation
    - Create AccessToken generation with 15-minute expiration
    - Create RefreshToken generation with 7-day expiration
    - Implement token validation and claim extraction
    - Use HS256 algorithm with JWT secret from configuration
    - _Requirements: 4.3, 4.4, 8.4, 8.8_
  
  - [ ]* 2.3 Write property test for TokenService round-trip preservation
    - **Property 4: Authentication Token Round-Trip Preservation**
    - **Validates: Requirements 4.3, 4.8, 8.4**
    - Test that any valid JWT preserves userId, email, role claims after decode
  
  - [~] 2.4 Implement PasswordService for bcrypt hashing and validation
    - Create HashPassword method using bcrypt with cost factor 12
    - Create VerifyPassword method for constant-time comparison
    - Implement password validation rules (8+ chars, uppercase, lowercase, number, special char)
    - Add email username check and common password database check
    - _Requirements: 2.3, 2.4, 2.5, 4.2, 29.1, 29.6_
  
  - [ ]* 2.5 Write property test for PasswordService validation rules
    - **Property 2: Password Validation Rules**
    - **Validates: Requirements 2.3, 2.4, 2.5, 29.1, 30.1**
    - Test that valid passwords (8+ chars, uppercase, lowercase, number, special) are accepted
    - Test that invalid passwords are rejected with reason listing
  
  - [ ]* 2.6 Write property test for PasswordService hash verification invariant
    - **Property 5: Password Hash Verification Invariant**
    - **Validates: Requirements 4.2, 29.1, 29.6**
    - Test that correct password verifies to true, any other password verifies to false
    - Test bcrypt collision resistance with random passwords

  - [~] 2.7 Create SessionService for session management
    - Implement CreateSession method storing refresh token hash, IP, user agent, device fingerprint
    - Implement ValidateSession method checking token hash and expiration
    - Implement TerminateSession and TerminateAllSessions methods
    - _Requirements: 4.5, 8.3, 8.5, 9.3, 14.7, 14.12_
  
  - [ ]* 2.8 Write property test for session concurrency limit
    - **Property 12: Concurrent Session Limit Enforcement**
    - **Validates: Requirements 14.4, 14.12**
    - Test that creating 4th session for user automatically terminates oldest session
    - Test invariant: active session count ≤ 3 for any user at any time
  
  - [~] 2.9 Create ValidationService for email and OTP validation
    - Implement EmailValidator using RFC 5322 regex
    - Implement PhoneNumberValidator for E.164 format
    - Implement OtpCodeValidator for 6-digit numeric validation
    - _Requirements: 2.2, 6.2, 7.2, 30.1_
  
  - [ ]* 2.10 Write property test for email validation consistency
    - **Property 1: Email Validation Consistency**
    - **Validates: Requirements 2.2, 30.1**
    - Test that RFC 5322 valid emails are accepted, invalid emails rejected
    - Generate random valid/invalid email formats
  
  - [~] 2.11 Create RateLimitService for endpoint rate limiting
    - Implement rate limiting logic using in-memory cache with expiration
    - Configure limits: login (5/15min), register (3/hour), password-reset (3/hour), otp-email (5/hour), otp-sms (5/hour)
    - Return HTTP status and Retry-After header
    - _Requirements: 2.12, 4.10, 6.6, 7.6, 10.7, 23.1-23.6_
  
  - [ ]* 2.12 Write property test for rate limiting determinism
    - **Property 11: Rate Limiting Determinism**
    - **Validates: Requirements 23.1, 23.2, 23.3, 23.4, 23.5, 23.6**
    - Test that first N requests succeed, requests > N fail with 429
    - Test with various entity identifiers (IP, email, phone)

- [ ] 3. Registration and Email Verification Endpoints
  - [~] 3.1 Implement POST /api/auth/register endpoint
    - Validate email format, password requirements
    - Call Supabase auth.sign_up()
    - Create UserProfile record with role 'customer'
    - Send verification email via Supabase
    - Return 201 with userId, email, message
    - Handle rate limiting, existing email (409), validation errors (400)
    - _Requirements: 2.1-2.12_
  
  - [~] 3.2 Implement POST /api/auth/resend-verification endpoint
    - Validate email exists and is unverified
    - Send new verification link with fresh 24-hour expiration
    - Handle rate limiting (3/hour per email), 429
    - _Requirements: 3.6-3.9_
  
  - [~] 3.3 Implement email verification link handling
    - Validate verification token from email link
    - Update auth.users.email_confirmed_at on success
    - Activate user account
    - Handle expired tokens (400) with resend option
    - _Requirements: 3.1-3.5_
  
  - [ ]* 3.4 Write property test for email verification token expiration
    - **Property 3: Email Verification Token Expiration**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    - Test that tokens valid before 24h expiration are accepted
    - Test that tokens after expiration are rejected

- [ ] 4. Login Endpoint and JWT Token Generation
  - [~] 4.1 Implement POST /api/auth/login endpoint
    - Call Supabase auth.sign_in_with_password()
    - Validate credentials, check email verified
    - Generate JWT and Refresh tokens via TokenService
    - Create session via SessionService with IP, user agent, fingerprint
    - Update last_login_at in user_profiles
    - Set httpOnly cookies (Secure, SameSite=Strict)
    - Return 200 with userId, email, role, displayName
    - Handle invalid credentials (401), unverified email (403), rate limit (429)
    - Log security event on failure
    - _Requirements: 4.1-4.12_
  
  - [ ]* 4.2 Write unit tests for login endpoint
    - Test successful login with valid credentials
    - Test invalid credentials return 401 with generic message
    - Test unverified email returns 403
    - Test rate limiting enforced (5/15min)
    - Test user enumeration prevented
    - _Requirements: 4.1-4.12_

- [ ] 5. Token Refresh Endpoint with Rotation
  - [~] 5.1 Implement POST /api/auth/refresh endpoint
    - Validate Refresh_Token from httpOnly cookie
    - Hash token and look up session in user_sessions
    - Check session expiration
    - Generate new JWT and Refresh tokens (token rotation)
    - Update session with new refresh token hash and expires_at
    - Detect and block token replay attacks (reused old tokens)
    - Invalidate all sessions on replay detection
    - Set new httpOnly cookies
    - Return 200 with userId, email, role
    - Handle missing/invalid token (401), expired (401), replay attack (401)
    - _Requirements: 8.1-8.11_
  
  - [ ]* 5.2 Write property test for token rotation correctness
    - **Property 7: Token Rotation Correctness**
    - **Validates: Requirements 8.4, 8.5, 8.6, 8.8**
    - Test that old refresh token becomes invalid after rotation
    - Test that new tokens are valid for authentication until expiration
    - Test exactly-once semantics of token rotation

- [ ] 6. Logout Endpoints
  - [~] 6.1 Implement POST /api/auth/logout endpoint
    - Validate JWT from httpOnly cookie
    - Delete current session from user_sessions using refresh token hash
    - Clear JWT and Refresh token cookies (empty, immediate expiration)
    - Log security event
    - Return 200 with message
    - Handle invalid/expired token (still clear cookies, return 200)
    - _Requirements: 9.1-9.5_
  
  - [~] 6.2 Implement POST /api/auth/logout-all endpoint
    - Validate JWT from httpOnly cookie
    - Delete all sessions for user from user_sessions
    - Clear cookies
    - Log security event
    - Return 200 with message
    - _Requirements: 9.6-9.10_
  
  - [ ]* 6.3 Write property test for logout idempotence
    - **Property 8: Logout Idempotence**
    - **Validates: Requirements 9.1, 9.5, 9.11**
    - Test that logout called once succeeds (200)
    - Test that calling logout again succeeds (200) without errors

- [ ] 7. Checkpoint - Core Authentication Flow Validation
  - [~] 7.1 Ensure all tests pass for registration, login, token refresh, logout
    - Run all unit tests for authentication endpoints
    - Verify JWT token generation, validation, rotation
    - Verify session management and cleanup
    - Ensure all property tests pass
    - Ensure all rate limiting tests pass
    - Ensure all rate limit violations trigger 429
    - Ensure security events are logged
    - Ensure no user enumeration occurs
    - Checkpoint: Verify that basic auth flow works end-to-end (register → verify → login → refresh → logout)


- [ ] 8. Password Reset Flow
  - [~] 8.1 Implement POST /api/auth/password-reset/request endpoint
    - Validate email format
    - Check email exists (but don't reveal result to prevent enumeration)
    - Generate secure password reset token with 1-hour expiration
    - Send email with reset link via Supabase
    - Return 200 even if email doesn't exist
    - Handle rate limiting (3/hour per email), 429
    - _Requirements: 10.1-10.7_
  
  - [~] 8.2 Implement POST /api/auth/password-reset/confirm endpoint
    - Validate reset token and expiration
    - Validate newPassword against password policy
    - Update user password in auth.users via bcrypt
    - Invalidate all sessions for user
    - Log security event
    - Return 200 with message
    - Handle invalid/expired token (400), validation errors (400)
    - _Requirements: 10.8-10.13_
  
  - [ ]* 8.3 Write property test for password reset token expiration
    - **Property 9: Password Reset Token Expiration**
    - **Validates: Requirements 10.3, 10.8, 10.9, 10.13**
    - Test that tokens valid before 1h expiration are accepted
    - Test that tokens after expiration are rejected

- [ ] 9. OTP Email Authentication
  - [~] 9.1 Implement POST /api/auth/otp/email/request endpoint
    - Validate email format
    - Generate 6-digit numeric OTP with 10-minute expiration
    - Store OTP in cache or database
    - Send OTP via Supabase email
    - Return 200 with message
    - Handle rate limiting (5/hour per email), 429
    - _Requirements: 6.1-6.5_
  
  - [~] 9.2 Implement POST /api/auth/otp/email/verify endpoint
    - Validate email and OTP code
    - Check OTP matches stored value and not expired
    - Invalidate OTP immediately to prevent reuse
    - Generate JWT and Refresh tokens via TokenService
    - Create session via SessionService
    - Create user if doesn't exist (new account with role 'customer')
    - Set httpOnly cookies
    - Return 200 with userId, email, role
    - Handle invalid/expired OTP (401), rate limit (429)
    - _Requirements: 6.7-6.12_
  
  - [ ]* 9.3 Write property test for OTP single-use enforcement
    - **Property 6: OTP Single-Use Enforcement**
    - **Validates: Requirements 6.11, 7.11**
    - Test that OTP succeeds on first verification
    - Test that same OTP fails on second verification attempt
    - Test that reuse fails even before expiration

- [ ] 10. OTP SMS Authentication
  - [~] 10.1 Implement POST /api/auth/otp/sms/request endpoint
    - Validate phoneNumber in E.164 format
    - Generate 6-digit numeric OTP with 10-minute expiration
    - Send OTP via Twilio SMS
    - Return 200 with message
    - Handle rate limiting (5/hour per phone), 429
    - _Requirements: 7.1-7.5_
  
  - [~] 10.2 Implement POST /api/auth/otp/sms/verify endpoint
    - Validate phoneNumber and OTP code
    - Check OTP matches and not expired
    - Invalidate OTP immediately
    - Generate JWT and Refresh tokens
    - Create session with IP, user agent, fingerprint
    - Create user if doesn't exist, store phone in auth.users
    - Set httpOnly cookies
    - Return 200 with userId, email, role
    - Handle invalid/expired OTP (401), rate limit (429)
    - _Requirements: 7.7-7.12_

- [ ] 11. OAuth Social Login
  - [~] 11.1 Implement GET /api/auth/oauth/google endpoint
    - Redirect to Google OAuth authorization page
    - Handle OAuth callback with authorization code
    - Exchange code for access token via Supabase
    - Retrieve user profile (email, name, avatar) from Google
    - Create or link account to existing email
    - Auto-mark email as verified
    - Generate JWT and Refresh tokens
    - Create session
    - Store OAuth provider identifier in metadata
    - Set httpOnly cookies
    - Redirect to dashboard
    - _Requirements: 5.1-5.12_
  
  - [~] 11.2 Implement GET /api/auth/oauth/facebook endpoint
    - Same flow as Google OAuth
    - _Requirements: 5.1-5.12_
  
  - [~] 11.3 Implement GET /api/auth/oauth/github endpoint
    - Same flow as Google OAuth
    - _Requirements: 5.1-5.12_

- [ ] 12. User Profile Endpoints
  - [~] 12.1 Implement GET /api/users/profile endpoint
    - Validate JWT from cookie
    - Query user_profiles joined with auth.users
    - Return 200 with userId, email, displayName, avatarUrl, phoneNumber, dateOfBirth, address, role, lastLoginAt, createdAt
    - Handle missing token (401)
    - _Requirements: 12.1-12.4_
  
  - [~] 12.2 Implement PUT /api/users/profile endpoint
    - Validate JWT
    - Validate displayName (1-100 chars if provided)
    - Update user_profiles with provided fields
    - Return 200 with updated profile
    - Handle validation errors (400)
    - _Requirements: 12.5-12.10_
  
  - [~] 12.3 Implement POST /api/users/profile/avatar endpoint
    - Validate JWT
    - Validate file type (jpg, png, webp) and size (max 5MB)
    - Upload to Supabase Storage 'avatars' bucket
    - Update avatar_url in user_profiles
    - Return 200 with new avatarUrl
    - Handle validation errors (400)
    - _Requirements: 12.11-12.14_
  
  - [ ]* 12.4 Write property test for user profile persistence round-trip
    - **Property 13: User Profile Persistence Round-Trip**
    - **Validates: Requirements 12.5, 12.8, 12.9**
    - Test that any valid profile update is immediately readable
    - Test that all fields are preserved without corruption

- [ ] 13. Session Management Endpoints
  - [~] 13.1 Implement GET /api/users/sessions endpoint
    - Validate JWT
    - Query user_sessions for current user
    - Parse user_agent to extract browser, OS
    - Mark current session with isCurrent: true
    - Return 200 with array of sessions: sessionId, ipAddress, deviceInfo, createdAt, expiresAt, isCurrent
    - _Requirements: 14.1-14.6_
  
  - [~] 13.2 Implement DELETE /api/users/sessions/{sessionId} endpoint
    - Validate JWT
    - Check sessionId belongs to authenticated user
    - Delete session from user_sessions
    - Return 200 with message
    - Handle unauthorized access (403), session not found (404)
    - _Requirements: 14.7-14.11_

- [ ] 14. Role-Based Access Control Middleware
  - [~] 14.1 Create authentication middleware
    - Extract JWT from httpOnly cookie
    - Validate token signature and expiration
    - Extract userId, email, role from claims
    - Attach user context to request
    - Handle missing/invalid token (401)
    - _Requirements: 13.1, 13.11_
  
  - [~] 14.2 Create authorization middleware
    - Check user role against endpoint requirements
    - Enforce guest < customer < admin hierarchy
    - Return 403 if insufficient privileges
    - Log authorization failures as security events
    - _Requirements: 13.2-13.4, 13.12_
  
  - [~] 14.3 Implement GET /api/auth/check-role endpoint
    - Validate JWT
    - Return 200 with current user role
    - Handle missing token (401)
    - _Requirements: 13.10_
  
  - [ ]* 14.4 Write property test for RBAC consistency
    - **Property 10: Role-Based Access Control Consistency**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
    - Test that requests with insufficient role return 403
    - Test that requests with sufficient role proceed normally
    - Test role hierarchy enforcement (guest < customer < admin)


- [ ] 15. Two-Factor Authentication (2FA) Setup
  - [~] 15.1 Implement POST /api/auth/2fa/setup endpoint
    - Validate JWT
    - Generate TOTP secret key using RFC 6238
    - Generate QR code image with otpauth:// URI
    - Generate 10 backup codes
    - Return 200 with qrCodeDataUrl, backupCodes, secret
    - _Requirements: 11.1-11.5_
  
  - [~] 15.2 Implement POST /api/auth/2fa/verify-setup endpoint
    - Validate JWT
    - Validate totpCode against secret key
    - Store secret encrypted in user metadata
    - Mark 2FA as enabled
    - Return 200 with confirmation
    - Handle invalid TOTP (401)
    - _Requirements: 11.6-11.9_
  
  - [~] 15.3 Implement POST /api/auth/2fa/verify-login endpoint
    - Validate totpCode after successful password login
    - Check code validity within time window
    - Allow backup codes as fallback
    - Generate and return JWT and Refresh tokens
    - Create session and set cookies
    - Return 200 with tokens
    - Handle invalid code (401)
    - _Requirements: 11.11-11.13_

- [ ] 16. Two-Factor Authentication Enforcement
  - [~] 16.1 Enforce 2FA requirement for admin users
    - Detect admin role before granting tokens
    - Require 2FA enabled for admin accounts
    - Return 403 if admin lacks 2FA
    - Log security event
    - _Requirements: 11.14_
  
  - [~] 16.2 Integrate 2FA into login flow
    - After password validation, check if 2FA enabled
    - If enabled, return partial response requiring TOTP
    - Block full token issuance until TOTP verified
    - _Requirements: 11.11_

- [ ] 17. Checkpoint - Auth Methods Complete
  - [~] 17.1 Ensure all authentication methods work end-to-end
    - Register and verify via email
    - Login with email/password
    - Login with OTP (email and SMS)
    - Login with OAuth (Google, Facebook, GitHub)
    - Setup and verify 2FA
    - Refresh tokens and rotate
    - Logout and terminate sessions
    - Ensure rate limiting on all endpoints
    - Ensure security events logged
    - Ensure all property tests pass

- [ ] 18. Admin User Management Endpoints
  - [~] 18.1 Implement GET /api/admin/users endpoint
    - Require admin role
    - Accept query params: page, pageSize, search, role, status
    - Filter by email/displayName (case-insensitive search)
    - Filter by role (guest, customer, admin)
    - Filter by status (active, blocked, unverified, deleted)
    - Join user_profiles with auth.users
    - Return 200 with paginated users array, totalCount, currentPage, pageSize
    - Handle authorization failure (403)
    - _Requirements: 15.1-15.7_
  
  - [~] 18.2 Implement PUT /api/admin/users/{userId}/role endpoint
    - Require admin role
    - Accept new role in request body
    - Update role in user_profiles
    - Log admin action in admin_logs
    - Return 200 with updated user
    - Handle missing user (404), authorization (403)
    - _Requirements: 16.1-16.3_
  
  - [~] 18.3 Implement POST /api/admin/users/{userId}/block endpoint
    - Require admin role
    - Update status to 'blocked' in user_profiles
    - Invalidate all sessions for user
    - Log admin action
    - Return 200 with message
    - _Requirements: 16.4-16.6_
  
  - [~] 18.4 Implement POST /api/admin/users/{userId}/unblock endpoint
    - Require admin role
    - Update status to 'active' in user_profiles
    - Log admin action
    - Return 200 with message
    - _Requirements: 16.7-16.8_
  
  - [~] 18.5 Implement DELETE /api/admin/users/{userId} endpoint
    - Require admin role
    - Soft delete: set deleted_at timestamp, status to 'deleted'
    - Invalidate all sessions
    - Log admin action with userId as target
    - Return 200 with message
    - _Requirements: 16.9-16.11_
  
  - [~] 18.6 Implement GET /api/admin/users/deleted endpoint
    - Require admin role
    - Query soft-deleted users (where deleted_at IS NOT NULL)
    - Support pagination
    - Return 200 with paginated deleted users
    - _Requirements: 17.1-17.2_
  
  - [~] 18.7 Implement POST /api/admin/users/{userId}/restore endpoint
    - Require admin role
    - Clear deleted_at timestamp, set status to 'active'
    - Log admin action
    - Return 200 with message
    - _Requirements: 17.3-17.4_

- [ ] 19. Admin Product Management Endpoints
  - [~] 19.1 Implement GET /api/admin/products endpoint
    - Require admin role
    - Accept pagination params: page, pageSize
    - Query products from gateway.products table
    - Return 200 with paginated products array
    - _Requirements: 18.1-18.2_
  
  - [~] 19.2 Implement POST /api/admin/products endpoint
    - Require admin role
    - Accept name, description, price, imageUrl
    - Create new product in database
    - Log admin action
    - Return 201 with created product
    - Handle validation errors (400)
    - _Requirements: 18.3-18.4_
  
  - [~] 19.3 Implement PUT /api/admin/products/{productId} endpoint
    - Require admin role
    - Update product fields
    - Log admin action with old/new values
    - Return 200 with updated product
    - Handle missing product (404)
    - _Requirements: 18.5-18.6_
  
  - [~] 19.4 Implement DELETE /api/admin/products/{productId} endpoint
    - Require admin role
    - Soft delete product or hard delete based on business logic
    - Log admin action
    - Return 200 with message
    - _Requirements: 18.7-18.8_
  
  - [~] 19.5 Implement POST /api/admin/products/images endpoint
    - Require admin role
    - Accept multipart form-data with image file
    - Validate file type and size
    - Upload to Supabase Storage 'products' bucket
    - Return 200 with imageUrl
    - _Requirements: 18.9-18.10_

- [ ] 20. Admin Analytics Endpoints
  - [~] 20.1 Implement GET /api/admin/analytics/users endpoint
    - Require admin role
    - Query user statistics:
      - Total users count
      - Customers count (role = 'customer')
      - Admins count (role = 'admin')
      - New users in last 7 days
      - New users in last 30 days
    - Return 200 with stats object
    - _Requirements: 19.1-19.3_
  
  - [~] 20.2 Implement GET /api/admin/analytics/chat-sessions endpoint
    - Require admin role
    - Query chat session statistics from brain.chat_sessions
    - Count total sessions, active sessions, completed sessions
    - Calculate average session duration
    - Return 200 with stats object
    - _Requirements: 19.4-19.5_
  
  - [~] 20.3 Implement GET /api/admin/analytics/products endpoint
    - Require admin role
    - Query product statistics:
      - Total products count
      - Products created by date range
    - Return 200 with stats object
    - _Requirements: 19.6-19.7_

- [ ] 21. Admin Logs Endpoint
  - [~] 21.1 Implement GET /api/admin/logs endpoint
    - Require admin role
    - Accept query params: page, pageSize, logLevel, eventType, startDate, endDate
    - Query admin_logs table
    - Filter by action (eventType)
    - Filter by date range
    - Include admin username, IP address, target resource
    - Return 200 with paginated logs array
    - _Requirements: 19.8-19.9_

- [ ] 22. GDPR Data Export Endpoint
  - [~] 22.1 Implement GET /api/users/data-export endpoint
    - Require authenticated user
    - Export all user data from auth.users, user_profiles, user_sessions, brain.chat_sessions
    - Combine into single JSON object
    - Include all fields with no data loss
    - Return as downloadable JSON file
    - Return 200 with JSON content-type and Content-Disposition header
    - _Requirements: 27.1-27.5_
  
  - [ ]* 22.2 Write property test for data export completeness
    - **Property 14: Data Export Completeness**
    - **Validates: Requirements 27.2, 27.3, 27.4, 27.5**
    - Test that exported JSON contains all user data
    - Test that JSON is valid and parseable
    - Test all required fields are present

- [ ] 23. Account Deletion Endpoint
  - [~] 23.1 Implement DELETE /api/users/account endpoint
    - Require authenticated user
    - Accept password or 2FA code for confirmation
    - Verify password with bcrypt or 2FA code
    - Soft delete: set deleted_at, status to 'deleted'
    - Invalidate all sessions
    - Export and archive user data for compliance
    - Log account deletion event
    - Return 200 with message
    - Handle invalid password/2FA (401)
    - _Requirements: 28.1-28.9_

- [ ] 24. Security Headers Middleware
  - [~] 24.1 Implement security headers middleware
    - Set Strict-Transport-Security header
    - Set X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
    - Set Content-Security-Policy
    - Set Referrer-Policy, Permissions-Policy
    - Apply to all responses
    - _Requirements: 24.1-24.6_

- [ ] 25. Error Handling and Response Formatting
  - [~] 25.1 Create global exception handling middleware
    - Catch all exceptions
    - Log errors with stack trace (internally only)
    - Return error response in standard format: error, statusCode, timestamp, details
    - Return generic messages for security errors (don't leak info)
    - Return specific field errors for validation
    - Handle DbException, HttpRequestException, custom exceptions
    - _Requirements: 25.1-25.5_

- [ ] 26. Checkpoint - Admin Features and Security
  - [~] 26.1 Ensure all admin endpoints work correctly
    - Test user search, filter, role changes
    - Test user blocking/unblocking
    - Test user soft deletion and restoration
    - Test product CRUD operations
    - Test analytics queries return valid data
    - Test logs are created for all admin actions
    - Test GDPR data export completeness
    - Test account deletion with data archival
    - Ensure all property tests pass
    - Ensure security headers present on all responses
    - Verify error responses don't leak sensitive info

- [ ] 27. Session Cleanup Job
  - [~] 27.1 Implement scheduled job for expired session cleanup
    - Run daily at 2 AM UTC
    - Query user_sessions where expires_at < now()
    - Delete expired sessions from database
    - Log cleanup event with count of deleted sessions
    - _Requirements: 8.12_

- [ ] 28. Integration Tests - Complete Authentication Flow
  - [~] 28.1 Write integration test for register → verify → login flow
    - Create new user via registration endpoint
    - Verify email via link
    - Login with credentials
    - Verify JWT and Refresh tokens received
    - Verify user profile created correctly
    - _Requirements: 2.1-2.12, 3.1-3.10, 4.1-4.12_
  
  - [~] 28.2 Write integration test for OAuth flow
    - Initiate OAuth with mock provider
    - Handle callback with authorization code
    - Verify user created or linked
    - Verify tokens generated
    - _Requirements: 5.1-5.12_
  
  - [~] 28.3 Write integration test for OTP flow (email and SMS)
    - Request OTP
    - Verify OTP sent
    - Verify OTP code
    - Verify tokens generated
    - Verify new user created if needed
    - _Requirements: 6.1-6.12, 7.1-7.12_
  
  - [~] 28.4 Write integration test for 2FA flow
    - Setup 2FA with TOTP secret
    - Login attempts with 2FA required
    - Verify TOTP validation
    - Test backup codes as fallback
    - _Requirements: 11.1-11.14_
  
  - [~] 28.5 Write integration test for session management
    - Create multiple sessions
    - Verify concurrent limit (max 3)
    - Verify oldest session auto-terminates
    - Verify session termination clears cookies
    - _Requirements: 14.1-14.12_
  
  - [~] 28.6 Write integration test for admin workflows
    - Admin role changes user role
    - Admin blocks user, sessions terminated
    - Admin creates/updates product
    - Verify audit logs recorded
    - _Requirements: 15.1-21.1_

- [ ] 29. Final Checkpoint - Full System Validation
  - [~] 29.1 Ensure all tests pass (unit, property, integration)
    - Run complete test suite
    - Verify all property-based tests with 100+ iterations
    - Verify all endpoints return correct status codes
    - Verify all error cases handled properly
    - Verify security events logged for all auth failures
    - Verify rate limiting enforced on all rate-limited endpoints
  
  - [~] 29.2 Verify RBAC enforcement across all endpoints
    - Guest users cannot access /chat, /profile, /admin routes
    - Customer users can access personal endpoints, not /admin
    - Admin users can access all admin endpoints
    - Role enforcement tested on all protected routes
  
  - [~] 29.3 Verify security requirements
    - All tokens stored in httpOnly cookies
    - All passwords hashed with bcrypt (never stored plain)
    - All refresh tokens hashed before storage
    - Rate limiting blocks excess requests with 429
    - Security events logged for all auth failures
    - No user enumeration on failed login/password-reset
    - Security headers present on all responses
  
  - [~] 29.4 Verify GDPR compliance
    - Data export returns all user data
    - Account deletion soft-deletes and archives data
    - Cascade delete working (deleting user deletes sessions, logs)
  
  - [~] 29.5 Verify all 15 correctness properties tested and passing
    - Property 1: Email Validation Consistency ✓
    - Property 2: Password Validation Rules ✓
    - Property 3: Email Verification Token Expiration ✓
    - Property 4: Authentication Token Round-Trip Preservation ✓
    - Property 5: Password Hash Verification Invariant ✓
    - Property 6: OTP Single-Use Enforcement ✓
    - Property 7: Token Rotation Correctness ✓
    - Property 8: Logout Idempotence ✓
    - Property 9: Password Reset Token Expiration ✓
    - Property 10: RBAC Consistency ✓
    - Property 11: Rate Limiting Determinism ✓
    - Property 12: Concurrent Session Limit Enforcement ✓
    - Property 13: User Profile Persistence Round-Trip ✓
    - Property 14: Data Export Completeness ✓
    - Property 15: Admin Action Audit Logging Consistency ✓

## Notes

- Tasks marked with `*` are optional property-based and unit tests. Core implementation tasks (without `*`) must be completed.
- Each task builds on previous tasks in sequence. Property tests should be written immediately after implementation to catch errors early.
- All endpoints require rate limiting middleware
- All authentication endpoints must log security events (login attempts, failures, rate limits, etc.)
- User enumeration must be prevented (don't reveal whether email exists)
- Passwords never logged in any form
- All passwords stored with bcrypt, refresh tokens hashed with bcrypt
- Token rotation must invalidate old tokens immediately
- Concurrent session limit enforced (max 3 per user)
- Admin users required to have 2FA enabled
- All admin actions logged in admin_logs table
- GDPR data export must be complete and valid JSON
- Account deletion is soft delete with data archival


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3"]
    },
    {
      "id": 1,
      "tasks": ["1.4", "2.1"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "2.4", "2.9", "2.11"]
    },
    {
      "id": 3,
      "tasks": ["2.3", "2.5", "2.6", "2.7", "2.10", "2.12"]
    },
    {
      "id": 4,
      "tasks": ["2.8", "3.1", "3.2", "3.3"]
    },
    {
      "id": 5,
      "tasks": ["3.4", "4.1", "5.1"]
    },
    {
      "id": 6,
      "tasks": ["4.2", "5.2", "6.1", "6.2"]
    },
    {
      "id": 7,
      "tasks": ["6.3", "8.1", "8.2"]
    },
    {
      "id": 8,
      "tasks": ["8.3", "9.1", "9.2"]
    },
    {
      "id": 9,
      "tasks": ["9.3", "10.1", "10.2"]
    },
    {
      "id": 10,
      "tasks": ["11.1", "11.2", "11.3"]
    },
    {
      "id": 11,
      "tasks": ["12.1", "12.2", "12.3"]
    },
    {
      "id": 12,
      "tasks": ["12.4", "13.1", "13.2"]
    },
    {
      "id": 13,
      "tasks": ["14.1", "14.2", "14.3"]
    },
    {
      "id": 14,
      "tasks": ["14.4", "15.1", "15.2", "15.3"]
    },
    {
      "id": 15,
      "tasks": ["16.1", "16.2"]
    },
    {
      "id": 16,
      "tasks": ["18.1", "18.2", "18.3", "18.4", "18.5", "18.6", "18.7"]
    },
    {
      "id": 17,
      "tasks": ["19.1", "19.2", "19.3", "19.4", "19.5"]
    },
    {
      "id": 18,
      "tasks": ["20.1", "20.2", "20.3"]
    },
    {
      "id": 19,
      "tasks": ["21.1", "22.1", "23.1"]
    },
    {
      "id": 20,
      "tasks": ["22.2", "24.1", "25.1"]
    },
    {
      "id": 21,
      "tasks": ["27.1", "28.1", "28.2", "28.3", "28.4", "28.5", "28.6"]
    }
  ]
}
```

This graph organizes tasks into 22 parallel execution waves. Wave dependencies ensure:
- Database schema (wave 0-1) completed before any service implementation
- Services (waves 2-5) completed before endpoints using them
- Core auth endpoints (waves 6-10) completed before admin features
- All implementation complete (wave 20) before integration tests (wave 21)
- Optional property tests included in each wave alongside implementation
