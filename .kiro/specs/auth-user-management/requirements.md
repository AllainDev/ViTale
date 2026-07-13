# Requirements Document

## Introduction

The Authentication & User Management System provides secure user authentication, authorization, and profile management for the ViTale demo system. This system integrates with Supabase Auth and supports multiple authentication methods (email/password, OAuth social login, OTP via email/SMS), role-based access control (Guest, Customer, Admin), and a comprehensive admin dashboard for user and system management.

This system serves as the foundation for secure access to System 1 (Showcase & Gateway) and System 2 (AI Brain), enabling personalized experiences, chat history persistence, and administrative control over users, products, and system operations.

## Glossary

- **Auth_System**: The authentication and user management subsystem built on Supabase Auth and ASP.NET Core
- **Supabase_Auth**: Supabase's built-in authentication service managing the `auth.users` table and authentication flows
- **User**: Any person interacting with the system, can be Guest (unauthenticated), Customer (authenticated), or Admin (privileged)
- **Guest**: Unauthenticated user with read-only access to `/showcase` page, cannot access `/chat`
- **Customer**: Authenticated user with access to `/chat` AI chatbot, chat history, and profile management
- **Admin**: Privileged user with full system control including user management, product CRUD, and analytics access
- **JWT_Access_Token**: Short-lived JSON Web Token (15 minutes) for API authentication, stored in httpOnly cookie
- **Refresh_Token**: Long-lived token (7 days) for obtaining new access tokens, stored in httpOnly cookie with rotation
- **Token_Rotation**: Security practice of issuing a new refresh token when the current one is used
- **Session**: Active user authentication state tracked in `gateway.user_sessions` table
- **User_Profile**: Extended user information stored in `gateway.user_profiles` table, linked to `auth.users.id`
- **OAuth_Provider**: Third-party authentication service (Google, Facebook, GitHub) for social login
- **OTP**: One-Time Password, a temporary code sent via email or SMS for passwordless authentication
- **2FA**: Two-Factor Authentication using TOTP (Time-based One-Time Password) for enhanced security
- **TOTP**: Time-based One-Time Password algorithm (RFC 6238) used with apps like Google Authenticator
- **Rate_Limiting**: Mechanism to restrict the number of requests from an IP address within a time window
- **Password_Hash**: Bcrypt-encrypted password stored in database, never stored in plain text
- **Email_Verification**: Process of confirming user email address via verification link
- **Admin_Dashboard**: Web interface at `/admin/*` routes for system administration
- **Chat_Session**: User's conversation with AI chatbot, stored in `brain.chat_sessions` table
- **Soft_Delete**: Marking records as deleted without physical removal, preserving data for audit
- **RBAC**: Role-Based Access Control, restricting system access based on user roles
- **Security_Event**: Authentication-related occurrence logged for security monitoring (e.g., failed login, rate limit violation)
- **httpOnly_Cookie**: Secure cookie not accessible to JavaScript, preventing XSS attacks
- **CORS**: Cross-Origin Resource Sharing, browser security mechanism controlling cross-domain requests

## Requirements

### Requirement 1: Database Schema for User Management

**User Story:** As a database administrator, I need to design database schemas for user profiles, sessions, and audit logs to support authentication, authorization, and compliance requirements.

#### Acceptance Criteria

1. THE Supabase_Auth SHALL manage user authentication in the `auth.users` table with fields: id (uuid), email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at, created_at, updated_at
2. THE Gateway_Schema SHALL contain table `user_profiles` with columns: id (uuid primary key), user_id (uuid foreign key to auth.users.id), display_name (text), avatar_url (text), date_of_birth (date), address (text), role (enum: guest, customer, admin), last_login_at (timestamptz), created_at (timestamptz), updated_at (timestamptz)
3. THE Gateway_Schema SHALL contain table `user_sessions` with columns: id (uuid primary key), user_id (uuid foreign key to auth.users.id), refresh_token_hash (text), ip_address (inet), user_agent (text), device_fingerprint (text), expires_at (timestamptz), created_at (timestamptz)
4. THE Gateway_Schema SHALL contain table `admin_logs` with columns: id (uuid primary key), admin_user_id (uuid foreign key to auth.users.id), action (text), target_resource (text), details (jsonb), ip_address (inet), created_at (timestamptz)
5. THE User_Profiles_Table SHALL have an index on the `user_id` column for efficient user lookups
6. THE User_Sessions_Table SHALL have an index on the `refresh_token_hash` column for fast token validation
7. THE Admin_Logs_Table SHALL have an index on the `admin_user_id` and `created_at` columns for audit queries
8. THE User_Profiles_Table SHALL enforce UNIQUE constraint on `user_id` to ensure one profile per user
9. WHEN a user record in `auth.users` is deleted, THE Auth_System SHALL cascade delete related records in `user_profiles`, `user_sessions`, and `admin_logs`
10. FOR ALL user profile records, the role value SHALL be one of: guest, customer, admin


### Requirement 2: Email and Password Registration

**User Story:** As a new user, I want to register an account with email and password, so that I can access personalized features like chat history.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/register` accepting JSON with fields: email, password, displayName (optional)
2. WHEN a registration request is received, THE Auth_System SHALL validate that email format is valid (RFC 5322 compliant)
3. WHEN a registration request is received, THE Auth_System SHALL validate that password meets requirements: minimum 8 characters, contains uppercase, lowercase, number, special character
4. WHEN a registration request is received, THE Auth_System SHALL validate that password does not contain the email username part
5. WHEN a registration request is received, THE Auth_System SHALL check password against database of top 10,000 common leaked passwords
6. WHEN validation succeeds, THE Auth_System SHALL call Supabase `auth.sign_up()` to create user in `auth.users` table
7. WHEN Supabase user creation succeeds, THE Auth_System SHALL create corresponding record in `gateway.user_profiles` with role set to `customer`
8. WHEN user creation succeeds, THE Auth_System SHALL send email verification link with 24-hour expiration to user's email address
9. WHEN email sending succeeds, THE Auth_System SHALL return HTTP status code 201 with JSON containing: userId, email, message indicating verification email sent
10. WHEN email already exists in system, THE Auth_System SHALL return HTTP status code 409 with error message indicating email already registered
11. WHEN password validation fails, THE Auth_System SHALL return HTTP status code 400 with descriptive error message listing failed requirements
12. WHEN rate limit is exceeded (3 registrations per hour per IP), THE Auth_System SHALL return HTTP status code 429 with Retry-After header


### Requirement 3: Email Verification Process

**User Story:** As a registered user, I need to verify my email address before accessing the system, so that the system can confirm my identity.

#### Acceptance Criteria

1. WHEN a user clicks the verification link in their email, THE Auth_System SHALL validate the verification token
2. WHEN the verification token is valid and not expired (within 24 hours), THE Auth_System SHALL update `auth.users.email_confirmed_at` to current timestamp
3. WHEN the verification token is valid, THE Auth_System SHALL activate the user account for login
4. WHEN the verification token is expired, THE Auth_System SHALL return HTTP status code 400 with error message and offer to resend verification email
5. WHEN the verification token is invalid, THE Auth_System SHALL return HTTP status code 400 with error message
6. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/resend-verification` accepting JSON with field: email
7. WHEN resend verification request is received, THE Auth_System SHALL validate that email exists and is unverified
8. WHEN resend validation succeeds and rate limit allows (3 times per hour per email), THE Auth_System SHALL send new verification link with fresh 24-hour expiration
9. WHEN resend rate limit is exceeded, THE Auth_System SHALL return HTTP status code 429 with Retry-After header
10. WHEN user attempts login with unverified email, THE Auth_System SHALL return HTTP status code 403 with message prompting email verification


### Requirement 4: Email and Password Login

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my account and personalized features.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/login` accepting JSON with fields: email, password
2. WHEN a login request is received, THE Auth_System SHALL call Supabase `auth.sign_in_with_password()` with provided credentials
3. WHEN credentials are valid and email is verified, THE Auth_System SHALL generate JWT_Access_Token with 15-minute expiration
4. WHEN credentials are valid, THE Auth_System SHALL generate Refresh_Token with 7-day expiration
5. WHEN tokens are generated, THE Auth_System SHALL store refresh token hash in `gateway.user_sessions` table with IP address, user agent, and device fingerprint
6. WHEN session is created, THE Auth_System SHALL update `gateway.user_profiles.last_login_at` to current timestamp
7. WHEN session is created, THE Auth_System SHALL set both tokens as httpOnly cookies with Secure and SameSite=Strict flags
8. WHEN login succeeds, THE Auth_System SHALL return HTTP status code 200 with JSON containing: userId, email, role, displayName
9. WHEN credentials are invalid, THE Auth_System SHALL return HTTP status code 401 with generic error message "Invalid credentials"
10. WHEN login rate limit is exceeded (5 attempts per 15 minutes per IP), THE Auth_System SHALL return HTTP status code 429 with Retry-After header
11. WHEN failed login attempt occurs, THE Auth_System SHALL log security event with timestamp, IP address, and attempted email
12. THE Auth_System SHALL NOT reveal whether email exists in the system when credentials are invalid (prevent user enumeration)


### Requirement 5: OAuth Social Login (Google, Facebook, GitHub)

**User Story:** As a user, I want to log in using my Google, Facebook, or GitHub account, so that I can access the system without creating a new password.

#### Acceptance Criteria

1. THE Auth_System SHALL expose HTTP GET endpoints at paths: `/api/auth/oauth/google`, `/api/auth/oauth/facebook`, `/api/auth/oauth/github`
2. WHEN a user initiates OAuth login, THE Auth_System SHALL redirect to the OAuth_Provider authorization page
3. WHEN OAuth_Provider returns authorization code, THE Auth_System SHALL exchange code for access token using Supabase OAuth flow
4. WHEN OAuth token exchange succeeds, THE Auth_System SHALL retrieve user profile information (email, name, avatar) from OAuth_Provider
5. WHEN user email from OAuth does not exist in system, THE Auth_System SHALL create new user in `auth.users` and `gateway.user_profiles` with role `customer`
6. WHEN user email from OAuth already exists in system, THE Auth_System SHALL log the user in to existing account
7. WHEN OAuth user creation or login succeeds, THE Auth_System SHALL generate JWT_Access_Token and Refresh_Token following same process as email/password login
8. WHEN OAuth user is created, THE Auth_System SHALL automatically mark email as verified since OAuth_Provider verified it
9. WHEN OAuth user profile includes avatar URL, THE Auth_System SHALL store it in `gateway.user_profiles.avatar_url`
10. WHEN OAuth authentication fails, THE Auth_System SHALL return HTTP status code 401 with error message indicating OAuth provider authentication failed
11. THE Auth_System SHALL store OAuth provider identifier (google, facebook, github) in user metadata for future reference
12. WHEN user has existing password-based account and logs in via OAuth with same email, THE Auth_System SHALL link OAuth provider to existing account


### Requirement 6: OTP via Email (Passwordless Login)

**User Story:** As a user, I want to log in using a one-time password sent to my email, so that I can access my account without remembering a password.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/otp/email/request` accepting JSON with field: email
2. WHEN an email OTP request is received, THE Auth_System SHALL validate email format
3. WHEN email validation succeeds, THE Auth_System SHALL generate 6-digit numeric OTP code with 10-minute expiration
4. WHEN OTP is generated, THE Auth_System SHALL send email containing OTP code and expiration time
5. WHEN email sending succeeds, THE Auth_System SHALL return HTTP status code 200 with message indicating OTP sent
6. WHEN email OTP request rate limit is exceeded (5 requests per hour per email), THE Auth_System SHALL return HTTP status code 429 with Retry-After header
7. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/otp/email/verify` accepting JSON with fields: email, otpCode
8. WHEN OTP verification request is received, THE Auth_System SHALL validate that otpCode matches stored OTP for the email
9. WHEN OTP is valid and not expired, THE Auth_System SHALL generate JWT_Access_Token and Refresh_Token following same process as email/password login
10. WHEN OTP is invalid or expired, THE Auth_System SHALL return HTTP status code 401 with error message
11. WHEN OTP is successfully verified, THE Auth_System SHALL invalidate the OTP to prevent reuse
12. WHEN user email does not exist in system and OTP is verified, THE Auth_System SHALL create new user account with role `customer`


### Requirement 7: OTP via SMS (Passwordless Login)

**User Story:** As a user, I want to log in using a one-time password sent to my phone, so that I can quickly access my account using my mobile device.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/otp/sms/request` accepting JSON with field: phoneNumber (E.164 format)
2. WHEN an SMS OTP request is received, THE Auth_System SHALL validate phoneNumber format against E.164 standard
3. WHEN phone validation succeeds, THE Auth_System SHALL generate 6-digit numeric OTP code with 10-minute expiration
4. WHEN OTP is generated, THE Auth_System SHALL send SMS message containing OTP code via Twilio or Supabase Edge Functions
5. WHEN SMS sending succeeds, THE Auth_System SHALL return HTTP status code 200 with message indicating OTP sent
6. WHEN SMS OTP request rate limit is exceeded (5 requests per hour per phone number), THE Auth_System SHALL return HTTP status code 429 with Retry-After header
7. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/otp/sms/verify` accepting JSON with fields: phoneNumber, otpCode
8. WHEN SMS OTP verification request is received, THE Auth_System SHALL validate that otpCode matches stored OTP for the phone number
9. WHEN OTP is valid and not expired, THE Auth_System SHALL generate JWT_Access_Token and Refresh_Token following same process as email/password login
10. WHEN OTP is invalid or expired, THE Auth_System SHALL return HTTP status code 401 with error message
11. WHEN OTP is successfully verified, THE Auth_System SHALL invalidate the OTP to prevent reuse
12. WHEN user phone number does not exist in system and OTP is verified, THE Auth_System SHALL create new user account with role `customer` and store phone in `auth.users.phone`


### Requirement 8: JWT Token Refresh and Rotation

**User Story:** As a logged-in user, I want my session to remain active beyond the access token expiration without re-entering credentials, while maintaining security through token rotation.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/refresh` accepting Refresh_Token from httpOnly cookie
2. WHEN a refresh request is received, THE Auth_System SHALL validate that Refresh_Token exists in request cookies
3. WHEN Refresh_Token exists, THE Auth_System SHALL hash the token and look up corresponding session in `gateway.user_sessions` table
4. WHEN session is found and not expired, THE Auth_System SHALL generate new JWT_Access_Token with 15-minute expiration
5. WHEN session is found and not expired, THE Auth_System SHALL generate new Refresh_Token with 7-day expiration (token rotation)
6. WHEN new tokens are generated, THE Auth_System SHALL update `gateway.user_sessions` with new refresh token hash and updated `expires_at`
7. WHEN new tokens are generated, THE Auth_System SHALL set both tokens as httpOnly cookies with Secure and SameSite=Strict flags
8. WHEN refresh succeeds, THE Auth_System SHALL return HTTP status code 200 with JSON containing: userId, email, role
9. WHEN Refresh_Token is missing or invalid, THE Auth_System SHALL return HTTP status code 401 with error message prompting re-login
10. WHEN Refresh_Token is expired, THE Auth_System SHALL delete the session from `gateway.user_sessions` and return HTTP status code 401
11. WHEN refresh token is reused (token replay attack), THE Auth_System SHALL invalidate all sessions for the user and return HTTP status code 401
12. THE Auth_System SHALL clean up expired sessions from `gateway.user_sessions` daily using scheduled job


### Requirement 9: User Logout and Session Termination

**User Story:** As a logged-in user, I want to log out of my current session or all sessions, so that I can secure my account when done using the system.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/logout` accepting JWT_Access_Token from httpOnly cookie
2. WHEN a logout request is received, THE Auth_System SHALL validate JWT_Access_Token and extract user ID
3. WHEN token is valid, THE Auth_System SHALL delete current session from `gateway.user_sessions` table based on refresh token hash
4. WHEN session is deleted, THE Auth_System SHALL clear both JWT_Access_Token and Refresh_Token cookies by setting them to empty with immediate expiration
5. WHEN logout succeeds, THE Auth_System SHALL return HTTP status code 200 with message indicating successful logout
6. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/logout-all` for logging out of all sessions
7. WHEN a logout-all request is received, THE Auth_System SHALL validate JWT_Access_Token and extract user ID
8. WHEN token is valid, THE Auth_System SHALL delete all sessions for the user from `gateway.user_sessions` table
9. WHEN all sessions are deleted, THE Auth_System SHALL clear current session cookies
10. WHEN logout-all succeeds, THE Auth_System SHALL return HTTP status code 200 with message indicating all sessions terminated
11. WHEN token is invalid or expired during logout, THE Auth_System SHALL still clear cookies and return HTTP status code 200
12. WHEN user logs out, THE Auth_System SHALL log security event with timestamp, IP address, and logout type (single/all)


### Requirement 10: Password Reset Flow

**User Story:** As a user who forgot my password, I want to reset my password via email, so that I can regain access to my account.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/password-reset/request` accepting JSON with field: email
2. WHEN a password reset request is received, THE Auth_System SHALL validate email format
3. WHEN email validation succeeds and email exists in system, THE Auth_System SHALL generate secure password reset token with 1-hour expiration
4. WHEN token is generated, THE Auth_System SHALL send email containing password reset link with token
5. WHEN email sending succeeds, THE Auth_System SHALL return HTTP status code 200 with message indicating reset email sent
6. WHEN email does not exist in system, THE Auth_System SHALL still return HTTP status code 200 to prevent user enumeration
7. WHEN password reset request rate limit is exceeded (3 requests per hour per email), THE Auth_System SHALL return HTTP status code 429 with Retry-After header
8. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/password-reset/confirm` accepting JSON with fields: token, newPassword
9. WHEN password reset confirmation is received, THE Auth_System SHALL validate token and check expiration
10. WHEN token is valid, THE Auth_System SHALL validate newPassword against password policy (8+ chars, uppercase, lowercase, number, special char)
11. WHEN validation succeeds, THE Auth_System SHALL update user password in `auth.users` using bcrypt hashing
12. WHEN password update succeeds, THE Auth_System SHALL invalidate all existing sessions for the user and return HTTP status code 200
13. WHEN token is invalid or expired, THE Auth_System SHALL return HTTP status code 400 with error message


### Requirement 11: Two-Factor Authentication (2FA) Setup and Verification

**User Story:** As a security-conscious user, I want to enable two-factor authentication, so that my account has an additional layer of security beyond password.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/2fa/setup` accepting JWT_Access_Token from httpOnly cookie
2. WHEN a 2FA setup request is received from authenticated user, THE Auth_System SHALL generate TOTP secret key using RFC 6238 algorithm
3. WHEN secret key is generated, THE Auth_System SHALL generate QR code image containing otpauth:// URI for authenticator app scanning
4. WHEN QR code is generated, THE Auth_System SHALL generate 10 single-use backup codes for account recovery
5. WHEN setup data is prepared, THE Auth_System SHALL return HTTP status code 200 with JSON containing: qrCodeDataUrl, backupCodes, secret (for manual entry)
6. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/2fa/verify-setup` accepting JSON with field: totpCode
7. WHEN 2FA verification request is received, THE Auth_System SHALL validate totpCode against stored secret key
8. WHEN totpCode is valid, THE Auth_System SHALL mark 2FA as enabled in user metadata and store secret key encrypted
9. WHEN 2FA is enabled, THE Auth_System SHALL return HTTP status code 200 with confirmation message
10. WHEN totpCode is invalid, THE Auth_System SHALL return HTTP status code 401 with error message prompting retry
11. WHERE user has 2FA enabled, WHEN user logs in with valid password, THE Auth_System SHALL require TOTP code before issuing tokens
12. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/auth/2fa/verify-login` accepting JSON with field: totpCode
13. WHEN 2FA login verification succeeds, THE Auth_System SHALL proceed with normal login flow (generate tokens, create session)
14. WHERE user role is admin, THE Auth_System SHALL require 2FA to be enabled before granting admin access


### Requirement 12: User Profile Management

**User Story:** As a customer, I want to view and update my profile information, so that I can keep my account details current.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/users/profile` accepting JWT_Access_Token from httpOnly cookie
2. WHEN a profile retrieval request is received, THE Auth_System SHALL validate token and extract user ID
3. WHEN token is valid, THE Auth_System SHALL query `gateway.user_profiles` joined with `auth.users` for user data
4. WHEN query succeeds, THE Auth_System SHALL return HTTP status code 200 with JSON containing: userId, email, displayName, avatarUrl, phoneNumber, dateOfBirth, address, role, lastLoginAt, createdAt
5. THE Auth_System SHALL expose an HTTP PUT endpoint at path `/api/users/profile` accepting JSON with optional fields: displayName, dateOfBirth, address
6. WHEN a profile update request is received, THE Auth_System SHALL validate token and extract user ID
7. WHEN token is valid, THE Auth_System SHALL validate displayName length (1-100 chars if provided)
8. WHEN validation succeeds, THE Auth_System SHALL update `gateway.user_profiles` with provided fields
9. WHEN update succeeds, THE Auth_System SHALL return HTTP status code 200 with updated profile data
10. WHEN validation fails, THE Auth_System SHALL return HTTP status code 400 with descriptive error message
11. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/users/profile/avatar` accepting multipart form-data with image file
12. WHEN avatar upload request is received, THE Auth_System SHALL validate file type (jpg, png, webp) and size (max 5MB)
13. WHEN validation succeeds, THE Auth_System SHALL upload image to Supabase Storage `avatars` bucket with user ID as filename
14. WHEN upload succeeds, THE Auth_System SHALL update `gateway.user_profiles.avatar_url` with public URL and return HTTP status code 200


### Requirement 13: Role-Based Access Control (RBAC)

**User Story:** As a system architect, I need to enforce role-based access control, so that users can only access features appropriate for their role.

#### Acceptance Criteria

1. THE Auth_System SHALL implement middleware that validates JWT_Access_Token on protected routes
2. WHEN token is valid, THE Auth_System SHALL extract user role from token claims
3. WHERE route requires `customer` role, WHEN user role is `guest`, THE Auth_System SHALL return HTTP status code 403 with error message
4. WHERE route requires `admin` role, WHEN user role is `customer` or `guest`, THE Auth_System SHALL return HTTP status code 403 with error message
5. THE Frontend SHALL allow guests to access route `/showcase` without authentication
6. THE Frontend SHALL redirect unauthenticated users to `/login` when they attempt to access route `/chat`
7. THE Frontend SHALL redirect non-admin users to `/` when they attempt to access routes under `/admin/*`
8. WHERE user is authenticated, THE Frontend SHALL display user menu with profile, logout options
9. WHERE user role is `admin`, THE Frontend SHALL display admin dashboard link in navigation
10. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/auth/check-role` returning current user role for frontend authorization decisions
11. WHEN token is missing or expired on protected route, THE Auth_System SHALL return HTTP status code 401 prompting re-authentication
12. THE Auth_System SHALL log authorization failures (role mismatch attempts) as security events


### Requirement 14: Session Management and Activity Tracking

**User Story:** As a user, I want to view my active sessions and device history, so that I can detect unauthorized access and manage my security.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/users/sessions` accepting JWT_Access_Token from httpOnly cookie
2. WHEN a sessions request is received, THE Auth_System SHALL validate token and extract user ID
3. WHEN token is valid, THE Auth_System SHALL query `gateway.user_sessions` for all active sessions for the user
4. WHEN query succeeds, THE Auth_System SHALL return HTTP status code 200 with JSON array containing: sessionId, ipAddress, deviceInfo (parsed from user_agent), createdAt, expiresAt, isCurrent
5. THE Auth_System SHALL parse user agent string to extract browser name and operating system for display
6. THE Auth_System SHALL mark the session corresponding to current request as `isCurrent: true` in response
7. THE Auth_System SHALL expose an HTTP DELETE endpoint at path `/api/users/sessions/{sessionId}` for terminating specific session
8. WHEN session termination request is received, THE Auth_System SHALL validate that sessionId belongs to authenticated user
9. WHEN validation succeeds, THE Auth_System SHALL delete session from `gateway.user_sessions` table
10. WHEN session deletion succeeds, THE Auth_System SHALL return HTTP status code 200 with confirmation message
11. WHEN user attempts to delete session belonging to another user, THE Auth_System SHALL return HTTP status code 403
12. WHEN concurrent session count exceeds 3 for a user, THE Auth_System SHALL automatically terminate oldest session before creating new session


### Requirement 15: Admin User Management Dashboard

**User Story:** As an admin, I want to view, search, and manage users, so that I can maintain system security and user accounts.

#### Acceptance Criteria

1. THE Frontend SHALL provide route `/admin/users` accessible only to users with role `admin`
2. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/admin/users` with query parameters: page, pageSize, search, role, status
3. WHEN admin users request is received with valid admin token, THE Auth_System SHALL query `gateway.user_profiles` joined with `auth.users`
4. WHEN query parameters include `search`, THE Auth_System SHALL filter results by email or displayName containing search term (case-insensitive)
5. WHEN query parameters include `role`, THE Auth_System SHALL filter results by exact role match
6. WHEN query parameters include `status`, THE Auth_System SHALL filter results by account status (active, blocked, unverified)
7. WHEN query succeeds, THE Auth_System SHALL return HTTP status code 200 with JSON containing: users array, totalCount, currentPage, pageSize
8. THE users array SHALL contain fields for each user: userId, email, displayName, role, status, createdAt, lastLoginAt
9. THE Frontend SHALL display users in table with columns: ID, Email, Name, Role, Status, Created Date, Last Login
10. THE Frontend SHALL implement pagination with 20 users per page
11. THE Frontend SHALL provide search input with debouncing (300ms delay) to filter users
12. THE Frontend SHALL provide dropdown filters for role (all, guest, customer, admin) and status (all, active, blocked, unverified)
13. THE Frontend SHALL provide action buttons for each user: View Details, Edit Role, Block/Unblock, Delete
14. WHEN admin attempts to access user management without admin role, THE Auth_System SHALL return HTTP status code 403


### Requirement 16: Admin User Role Management

**User Story:** As an admin, I want to change user roles, so that I can grant or revoke privileges as needed.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP PUT endpoint at path `/api/admin/users/{userId}/role` accepting JSON with field: role
2. WHEN role update request is received with valid admin token, THE Auth_System SHALL validate that new role is one of: guest, customer, admin
3. WHEN validation succeeds, THE Auth_System SHALL verify that target userId exists in system
4. WHEN userId exists, THE Auth_System SHALL update `gateway.user_profiles.role` to new role value
5. WHEN role update succeeds, THE Auth_System SHALL log action in `gateway.admin_logs` with admin_user_id, action type, target_resource, and details
6. WHEN role update succeeds, THE Auth_System SHALL return HTTP status code 200 with updated user data
7. WHERE new role is `admin`, THE Auth_System SHALL verify that user has 2FA enabled before allowing role change
8. WHEN attempting to set admin role for user without 2FA, THE Auth_System SHALL return HTTP status code 400 with error message requiring 2FA setup
9. WHEN admin attempts to change their own role, THE Auth_System SHALL return HTTP status code 403 to prevent privilege escalation
10. WHEN validation fails, THE Auth_System SHALL return HTTP status code 400 with descriptive error message
11. WHEN userId does not exist, THE Auth_System SHALL return HTTP status code 404
12. WHEN non-admin user attempts role update, THE Auth_System SHALL return HTTP status code 403


### Requirement 17: Admin User Block/Unblock

**User Story:** As an admin, I want to block or unblock user accounts, so that I can prevent access for security or policy violations.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/admin/users/{userId}/block` for blocking users
2. WHEN block request is received with valid admin token, THE Auth_System SHALL verify that target userId exists
3. WHEN userId exists, THE Auth_System SHALL update user status to `blocked` in `gateway.user_profiles`
4. WHEN user is blocked, THE Auth_System SHALL invalidate all active sessions for that user in `gateway.user_sessions`
5. WHEN block succeeds, THE Auth_System SHALL log action in `gateway.admin_logs` with reason (if provided)
6. WHEN block succeeds, THE Auth_System SHALL return HTTP status code 200 with confirmation message
7. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/admin/users/{userId}/unblock` for unblocking users
8. WHEN unblock request is received with valid admin token, THE Auth_System SHALL update user status to `active`
9. WHEN unblock succeeds, THE Auth_System SHALL log action in `gateway.admin_logs` and return HTTP status code 200
10. WHEN blocked user attempts to log in, THE Auth_System SHALL return HTTP status code 403 with error message indicating account is blocked
11. WHEN admin attempts to block their own account, THE Auth_System SHALL return HTTP status code 403
12. WHEN admin attempts to block another admin, THE Auth_System SHALL require confirmation and log high-priority security event


### Requirement 18: Admin User Deletion (Soft Delete)

**User Story:** As an admin, I want to delete user accounts while preserving audit trail, so that I can comply with data management policies.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP DELETE endpoint at path `/api/admin/users/{userId}` for soft deleting users
2. WHEN delete request is received with valid admin token, THE Auth_System SHALL verify that target userId exists
3. WHEN userId exists, THE Auth_System SHALL mark user as deleted by updating status to `deleted` in `gateway.user_profiles`
4. WHEN user is marked deleted, THE Auth_System SHALL set `deleted_at` timestamp in user metadata
5. WHEN user is marked deleted, THE Auth_System SHALL invalidate all active sessions in `gateway.user_sessions`
6. WHEN deletion succeeds, THE Auth_System SHALL log action in `gateway.admin_logs` with reason (if provided)
7. WHEN deletion succeeds, THE Auth_System SHALL return HTTP status code 200 with confirmation message
8. WHEN deleted user attempts to log in, THE Auth_System SHALL return HTTP status code 403 with error message indicating account is deleted
9. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/admin/users/deleted` to list soft-deleted users
10. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/admin/users/{userId}/restore` to restore soft-deleted users
11. WHEN restore request succeeds, THE Auth_System SHALL update status to `active` and clear `deleted_at` timestamp
12. WHEN admin attempts to delete their own account, THE Auth_System SHALL return HTTP status code 403


### Requirement 19: Admin Product Management

**User Story:** As an admin, I want to create, edit, and delete products in the showcase, so that I can maintain the product catalog.

#### Acceptance Criteria

1. THE Frontend SHALL provide route `/admin/products` accessible only to users with role `admin`
2. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/admin/products` with pagination parameters
3. WHEN admin products request is received with valid admin token, THE Auth_System SHALL return paginated list of products from `gateway.products` table
4. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/admin/products` accepting JSON with fields: name, description, price, imageUrl
5. WHEN product creation request is received with valid admin token, THE Auth_System SHALL validate name (1-200 chars) and price (>= 0)
6. WHEN validation succeeds, THE Auth_System SHALL insert new product into `gateway.products` table
7. WHEN product creation succeeds, THE Auth_System SHALL log action in `gateway.admin_logs` and return HTTP status code 201
8. THE Auth_System SHALL expose an HTTP PUT endpoint at path `/api/admin/products/{productId}` for updating products
9. WHEN product update request is received, THE Auth_System SHALL validate fields and update record in database
10. WHEN product update succeeds, THE Auth_System SHALL log action in `gateway.admin_logs` and return HTTP status code 200
11. THE Auth_System SHALL expose an HTTP DELETE endpoint at path `/api/admin/products/{productId}` for deleting products
12. WHEN product deletion request is received, THE Auth_System SHALL delete record from `gateway.products` table
13. WHEN product deletion succeeds, THE Auth_System SHALL log action in `gateway.admin_logs` and return HTTP status code 200
14. WHEN non-admin user attempts product management, THE Auth_System SHALL return HTTP status code 403


### Requirement 20: Admin Product Image Upload

**User Story:** As an admin, I want to upload product images to Supabase Storage, so that products have visual representation in the showcase.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP POST endpoint at path `/api/admin/products/images` accepting multipart form-data with image file
2. WHEN image upload request is received with valid admin token, THE Auth_System SHALL validate file type (jpg, png, webp)
3. WHEN file type is valid, THE Auth_System SHALL validate file size (max 10MB)
4. WHEN validation succeeds, THE Auth_System SHALL generate unique filename using UUID to prevent collisions
5. WHEN filename is generated, THE Auth_System SHALL upload image to Supabase Storage bucket `products`
6. WHEN upload succeeds, THE Auth_System SHALL retrieve public URL for uploaded image
7. WHEN public URL is obtained, THE Auth_System SHALL return HTTP status code 200 with JSON containing: imageUrl
8. WHEN validation fails, THE Auth_System SHALL return HTTP status code 400 with descriptive error message
9. WHEN upload fails, THE Auth_System SHALL return HTTP status code 500 with error message
10. THE Frontend SHALL provide image upload widget with drag-and-drop functionality and preview
11. THE Frontend SHALL display upload progress percentage during image upload
12. WHEN image upload completes, THE Frontend SHALL populate imageUrl field in product form automatically


### Requirement 21: Admin Analytics Dashboard

**User Story:** As an admin, I want to view analytics about users, chat sessions, and product views, so that I can understand system usage and make data-driven decisions.

#### Acceptance Criteria

1. THE Frontend SHALL provide route `/admin/dashboard` accessible only to users with role `admin`
2. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/admin/analytics/users` returning user statistics
3. WHEN analytics request is received with valid admin token, THE Auth_System SHALL query `gateway.user_profiles` to calculate: total users, users by role (guest, customer, admin)
4. WHEN query succeeds, THE Auth_System SHALL return HTTP status code 200 with JSON containing: totalUsers, customerCount, adminCount, newUsersLast7Days, newUsersLast30Days
5. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/admin/analytics/chat-sessions` returning chat statistics
6. WHEN chat analytics request is received, THE Auth_System SHALL query `brain.chat_sessions` to calculate: active sessions today, active sessions this week
7. WHEN query succeeds, THE Auth_System SHALL return HTTP status code 200 with chat session statistics
8. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/admin/analytics/products` returning product view statistics
9. WHEN product analytics request is received, THE Auth_System SHALL return product view counts and top 5 most viewed products
10. THE Frontend SHALL display analytics in card widgets with icons and formatted numbers
11. THE Frontend SHALL display line chart for user growth over last 30 days using data from analytics endpoint
12. THE Frontend SHALL display bar chart for user distribution by role
13. WHEN non-admin user attempts to access analytics, THE Auth_System SHALL return HTTP status code 403


### Requirement 22: Admin System Logs Viewer

**User Story:** As an admin, I want to view system logs including authentication events, errors, and security events, so that I can monitor system health and investigate issues.

#### Acceptance Criteria

1. THE Frontend SHALL provide route `/admin/logs` accessible only to users with role `admin`
2. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/admin/logs` with query parameters: page, pageSize, logLevel, eventType, startDate, endDate
3. WHEN logs request is received with valid admin token, THE Auth_System SHALL query system logs from database or log aggregation service
4. WHEN query parameters include `logLevel`, THE Auth_System SHALL filter by log level (info, warning, error, critical)
5. WHEN query parameters include `eventType`, THE Auth_System SHALL filter by event type (login_success, login_failure, password_reset, rate_limit_violation, api_error)
6. WHEN query parameters include date range, THE Auth_System SHALL filter logs by timestamp within specified range
7. WHEN query succeeds, THE Auth_System SHALL return HTTP status code 200 with JSON containing: logs array, totalCount, currentPage, pageSize
8. THE logs array SHALL contain fields for each log entry: logId, timestamp, logLevel, eventType, message, userId (if applicable), ipAddress, details (JSON)
9. THE Frontend SHALL display logs in table with columns: Timestamp, Level, Event Type, Message, User, IP Address, Actions
10. THE Frontend SHALL provide dropdown filters for log level and event type
11. THE Frontend SHALL provide date range picker for filtering logs by time period
12. THE Frontend SHALL implement pagination with 50 logs per page
13. THE Frontend SHALL provide "View Details" action that displays full log entry in modal dialog
14. WHEN non-admin user attempts to access logs, THE Auth_System SHALL return HTTP status code 403


### Requirement 23: Rate Limiting for Authentication Endpoints

**User Story:** As a security engineer, I need to implement rate limiting on authentication endpoints, so that the system is protected from brute force attacks and abuse.

#### Acceptance Criteria

1. THE Auth_System SHALL implement rate limiting middleware that tracks request counts by IP address and endpoint
2. WHERE endpoint is `/api/auth/login`, THE Auth_System SHALL limit requests to 5 per 15 minutes per IP address
3. WHERE endpoint is `/api/auth/register`, THE Auth_System SHALL limit requests to 3 per hour per IP address
4. WHERE endpoint is `/api/auth/password-reset/request`, THE Auth_System SHALL limit requests to 3 per hour per email address
5. WHERE endpoint is `/api/auth/otp/email/request` or `/api/auth/otp/sms/request`, THE Auth_System SHALL limit requests to 5 per hour per email or phone number
6. WHEN rate limit is exceeded, THE Auth_System SHALL return HTTP status code 429 with JSON error response
7. WHEN rate limit is exceeded, THE Auth_System SHALL include `Retry-After` header indicating seconds until limit resets
8. WHEN rate limit is exceeded, THE Auth_System SHALL log security event with IP address, endpoint, and timestamp
9. THE Auth_System SHALL store rate limit counters in Redis or in-memory cache with automatic expiration
10. THE Auth_System SHALL reset rate limit counters after the time window expires
11. WHERE IP address is in admin whitelist, THE Auth_System SHALL bypass rate limiting
12. WHEN rate limit violation occurs multiple times (5+ in 1 hour), THE Auth_System SHALL log high-priority security event for investigation


### Requirement 24: Auto-Logout After Inactivity

**User Story:** As a security-conscious user, I want to be automatically logged out after 30 minutes of inactivity, so that my account is protected if I forget to log out.

#### Acceptance Criteria

1. THE Frontend SHALL track user activity including mouse movements, keyboard events, and API requests
2. WHEN user activity is detected, THE Frontend SHALL reset inactivity timer to 0
3. WHEN inactivity timer reaches 30 minutes without user activity, THE Frontend SHALL call `/api/auth/logout` endpoint
4. WHEN logout succeeds, THE Frontend SHALL redirect user to login page with message indicating session expired due to inactivity
5. THE Frontend SHALL display warning notification 2 minutes before auto-logout with option to extend session
6. WHEN user clicks "Extend Session" in warning notification, THE Frontend SHALL make API request to refresh token
7. WHEN token refresh succeeds, THE Frontend SHALL reset inactivity timer
8. THE Frontend SHALL store inactivity timer state in memory, NOT in localStorage (to prevent cross-tab synchronization)
9. WHEN user opens multiple browser tabs, each tab SHALL maintain independent inactivity timer
10. WHERE user is on `/admin/*` routes, THE inactivity timeout SHALL be reduced to 15 minutes for enhanced security
11. THE Frontend SHALL clear all application state and cached data when auto-logout occurs
12. WHEN auto-logout occurs, THE Auth_System SHALL log security event with reason "inactivity_timeout"


### Requirement 25: Frontend Authentication UI Components

**User Story:** As a frontend developer, I need well-designed authentication UI components using Tailwind CSS and shadcn/ui, so that users have a smooth authentication experience.

#### Acceptance Criteria

1. THE Frontend SHALL provide route `/login` displaying login form with email, password fields and "Login" button
2. THE Frontend SHALL provide route `/register` displaying registration form with email, password, confirm password, display name fields and "Register" button
3. THE Frontend SHALL implement real-time client-side validation with error messages displayed below fields
4. WHEN password field loses focus, THE Frontend SHALL validate password against policy and display requirements checklist
5. THE Frontend SHALL display password strength indicator (weak, medium, strong) based on password complexity
6. THE Frontend SHALL provide "Show/Hide Password" toggle button for password fields
7. THE Frontend SHALL display OAuth login buttons for Google, Facebook, GitHub below main login form
8. THE Frontend SHALL provide "Forgot Password?" link redirecting to `/password-reset` route
9. THE Frontend SHALL display loading spinner on submit button during authentication requests
10. WHEN authentication request succeeds, THE Frontend SHALL display success toast notification and redirect to appropriate page
11. WHEN authentication request fails, THE Frontend SHALL display error message in toast notification or above form
12. THE Frontend SHALL implement form validation preventing submit when required fields are empty
13. THE Frontend SHALL use shadcn/ui components: Input, Button, Label, Card, Toast for consistent styling
14. THE Frontend SHALL be responsive with mobile-first design optimized for screens from 320px to 1920px width


### Requirement 26: Multi-Language Support (English and Vietnamese)

**User Story:** As a user, I want to switch between English and Vietnamese languages, so that I can use the system in my preferred language.

#### Acceptance Criteria

1. THE Frontend SHALL implement i18n (internationalization) using next-intl or react-i18next library
2. THE Frontend SHALL provide language switcher in header allowing users to select English or Vietnamese
3. WHEN user selects language, THE Frontend SHALL persist language preference in localStorage
4. WHEN language is changed, THE Frontend SHALL re-render all UI text, labels, error messages, and validation messages in selected language
5. THE Frontend SHALL load language translations from JSON files: `en.json` and `vi.json` in `/locales` directory
6. THE translation files SHALL contain keys for all UI text including: form labels, button text, error messages, validation messages, toast notifications
7. WHERE user has not selected language, THE Frontend SHALL detect browser language and default to English if not Vietnamese
8. THE Auth_System SHALL return error messages in JSON format with error codes that Frontend can map to translated messages
9. THE Frontend SHALL format dates and times according to selected locale (en-US or vi-VN)
10. THE Frontend SHALL format currency values according to selected locale (USD for English, VND for Vietnamese)
11. WHEN language preference is stored, THE Frontend SHALL use same language on next visit without requiring re-selection
12. THE Frontend SHALL support RTL (right-to-left) text direction if additional languages are added in future


### Requirement 27: GDPR Compliance - Data Export and Right to be Forgotten

**User Story:** As a user, I want to export my personal data or request account deletion, so that I can exercise my GDPR rights.

#### Acceptance Criteria

1. THE Auth_System SHALL expose an HTTP GET endpoint at path `/api/users/data-export` accepting JWT_Access_Token
2. WHEN data export request is received, THE Auth_System SHALL validate token and extract user ID
3. WHEN token is valid, THE Auth_System SHALL collect all user data from `auth.users`, `gateway.user_profiles`, `gateway.user_sessions`, `brain.chat_sessions`
4. WHEN data is collected, THE Auth_System SHALL generate JSON file containing all user personal information
5. WHEN JSON file is generated, THE Auth_System SHALL return HTTP status code 200 with JSON data as downloadable file
6. THE Auth_System SHALL expose an HTTP DELETE endpoint at path `/api/users/account` for account deletion
7. WHEN account deletion request is received, THE Auth_System SHALL require re-authentication (password or 2FA confirmation)
8. WHEN re-authentication succeeds, THE Auth_System SHALL permanently delete user records from `auth.users`, `gateway.user_profiles`, `gateway.user_sessions`
9. WHEN user has chat history in `brain.chat_sessions`, THE Auth_System SHALL delete or anonymize chat records per retention policy
10. WHEN account deletion completes, THE Auth_System SHALL send confirmation email to user's registered email address
11. WHEN account deletion completes, THE Auth_System SHALL log action in `gateway.admin_logs` for compliance audit
12. THE Frontend SHALL provide data export and account deletion options in user profile settings page


### Requirement 28: Security Headers and HTTPS Enforcement

**User Story:** As a security engineer, I need to enforce HTTPS and set security headers, so that the system is protected against common web vulnerabilities.

#### Acceptance Criteria

1. THE Auth_System SHALL redirect all HTTP requests to HTTPS in production environment
2. THE Auth_System SHALL set `Strict-Transport-Security` header with value `max-age=31536000; includeSubDomains; preload`
3. THE Auth_System SHALL set `X-Content-Type-Options` header with value `nosniff`
4. THE Auth_System SHALL set `X-Frame-Options` header with value `DENY` to prevent clickjacking
5. THE Auth_System SHALL set `X-XSS-Protection` header with value `1; mode=block`
6. THE Auth_System SHALL set `Content-Security-Policy` header restricting resource loading to trusted sources
7. THE Auth_System SHALL set `Referrer-Policy` header with value `strict-origin-when-cross-origin`
8. THE Auth_System SHALL set `Permissions-Policy` header disabling unnecessary browser features (geolocation, camera, microphone unless needed)
9. WHERE cookies are set, THE Auth_System SHALL use flags: `HttpOnly`, `Secure`, `SameSite=Strict` for authentication cookies
10. WHERE cookies are set, THE Auth_System SHALL use flags: `HttpOnly`, `Secure`, `SameSite=Lax` for CSRF tokens
11. THE Frontend SHALL enforce HTTPS for all API requests in production
12. WHEN running in localhost development, THE Auth_System SHALL allow HTTP for convenience but log security warnings


### Requirement 29: Password Hashing and Storage Security

**User Story:** As a security engineer, I need to ensure passwords are hashed using strong algorithms, so that user credentials are protected even if database is compromised.

#### Acceptance Criteria

1. THE Auth_System SHALL use bcrypt algorithm for password hashing with cost factor of 12
2. WHEN user registers or changes password, THE Auth_System SHALL generate unique salt for each password
3. WHEN password is hashed, THE Auth_System SHALL store only the hashed value in `auth.users.encrypted_password`
4. THE Auth_System SHALL NEVER store passwords in plain text or reversible encryption
5. THE Auth_System SHALL NEVER log passwords in plain text or hashed form
6. WHEN user logs in, THE Auth_System SHALL hash provided password and compare with stored hash using timing-safe comparison
7. THE Auth_System SHALL use constant-time comparison function to prevent timing attacks
8. WHERE password hash format needs upgrade (algorithm or cost factor change), THE Auth_System SHALL rehash on next successful login
9. THE Auth_System SHALL reject passwords that appear in database of top 10,000 leaked passwords by checking against local hash database
10. THE Auth_System SHALL NOT send password hashes to external APIs for breach checking (prevent exposure)
11. WHEN password validation occurs, THE Auth_System SHALL implement early rejection for invalid formats before expensive bcrypt comparison
12. THE Auth_System SHALL use Supabase Auth's built-in password hashing which implements these security practices


### Requirement 30: Input Validation and SQL Injection Prevention

**User Story:** As a security engineer, I need to validate and sanitize all user inputs, so that the system is protected against injection attacks.

#### Acceptance Criteria

1. THE Auth_System SHALL validate all input fields for type, length, and format before processing
2. THE Auth_System SHALL use parameterized queries for all database operations to prevent SQL injection
3. THE Auth_System SHALL reject inputs containing SQL keywords in contexts where they are not expected
4. THE Auth_System SHALL validate email addresses using regex pattern matching RFC 5322 standard
5. THE Auth_System SHALL validate phone numbers using E.164 format validation
6. THE Auth_System SHALL validate URLs using URL parsing library to ensure proper format
7. THE Auth_System SHALL sanitize HTML content in user inputs to prevent XSS attacks by escaping special characters
8. THE Auth_System SHALL validate file uploads by checking magic bytes (file signature) not just file extension
9. THE Auth_System SHALL reject file uploads containing executable code or scripts
10. THE Auth_System SHALL limit string field lengths to maximum defined in database schema
11. THE Auth_System SHALL validate enum fields against allowed values before database insert
12. WHEN validation fails, THE Auth_System SHALL return HTTP status code 400 with specific error messages indicating which fields failed validation


## Correctness Properties

*Properties are characteristics or behaviors that should hold true across all valid executions of the authentication system. These properties serve as formal statements about system correctness and can be verified through property-based testing.*

### Property 1: Authentication Token Round-Trip Preservation

FOR ALL valid JWT_Access_Token values generated by Auth_System, decoding the token and extracting claims SHALL produce user data (userId, email, role) that matches the original user data used to generate the token.

**Validates: Requirements 4, 5, 6, 7, 8**

**Rationale:** This is a fundamental round-trip property ensuring token encoding/decoding is lossless. If user identity cannot survive token serialization, the authentication system cannot be trusted.

### Property 2: Password Hash Verification Invariant

FOR ALL valid passwords and their corresponding bcrypt hashes stored in the system, verifying the password against its hash SHALL always return true, and verifying any other password against that hash SHALL always return false.

**Validates: Requirement 29**

**Rationale:** This invariant ensures password hashing is deterministic for verification while maintaining cryptographic security. Hash collisions or verification failures compromise authentication integrity.


### Property 3: Role-Based Access Control Consistency

FOR ALL authenticated requests to protected endpoints, IF user role is insufficient for the endpoint's required role, THEN Auth_System SHALL return HTTP status code 403, and IF user role is sufficient, THEN Auth_System SHALL process the request normally.

**Validates: Requirement 13**

**Rationale:** RBAC must be consistent and predictable. Authorization decisions must depend solely on user role, not on request timing, state, or other variables.

### Property 4: Rate Limiting Idempotence

FOR ALL rate-limited endpoints, IF N requests are made within the time window and N ≤ limit, THEN all N requests SHALL succeed with appropriate status codes, and IF N > limit, THEN exactly (N - limit) requests SHALL fail with HTTP status code 429.

**Validates: Requirement 23**

**Rationale:** Rate limiting must be deterministic. The Nth+1 request where N=limit should always fail regardless of request timing or concurrency.

### Property 5: Session Token Rotation Correctness

FOR ALL refresh token requests, WHEN Auth_System issues new JWT_Access_Token and Refresh_Token, THEN the old Refresh_Token SHALL be invalidated and new tokens SHALL be valid for authentication until their expiration.

**Validates: Requirement 8**

**Rationale:** Token rotation must maintain exactly-once semantics. Old tokens must be unusable after rotation to prevent replay attacks, while new tokens must work immediately.


### Property 6: Email Verification State Consistency

FOR ALL user accounts, WHEN email verification succeeds, THEN `auth.users.email_confirmed_at` SHALL be set to a non-null timestamp, and WHEN login is attempted with unverified email, THEN Auth_System SHALL reject with HTTP status code 403.

**Validates: Requirement 3**

**Rationale:** Email verification state must be binary and consistent. A user is either verified or not, and authentication behavior must match this state predictably.

### Property 7: OTP Single-Use Property

FOR ALL generated OTP codes, WHEN the OTP is successfully verified once, THEN subsequent verification attempts with the same OTP SHALL fail with HTTP status code 401.

**Validates: Requirements 6.11, 7.11**

**Rationale:** OTP codes must be single-use to prevent replay attacks. Once used, an OTP should be permanently invalidated regardless of expiration time.

### Property 8: User Data Export Completeness

FOR ALL authenticated users requesting data export, the exported JSON SHALL contain all user data from `auth.users`, `gateway.user_profiles`, `gateway.user_sessions`, and `brain.chat_sessions` tables, and parsing the JSON SHALL yield records with all required fields.

**Validates: Requirement 27**

**Rationale:** GDPR compliance requires complete data export. This round-trip-like property ensures all user data is captured in the export and is parseable.


### Property 9: Admin Action Audit Trail Invariant

FOR ALL admin actions (user role change, block/unblock, product CRUD), WHEN action completes successfully, THEN a corresponding record SHALL exist in `gateway.admin_logs` with fields: admin_user_id, action, target_resource, details, timestamp.

**Validates: Requirements 16, 17, 18, 19**

**Rationale:** This invariant ensures audit trail completeness. Every privileged action must be logged for compliance and security monitoring.

### Property 10: Password Policy Enforcement Consistency

FOR ALL password registration or reset attempts, IF password fails any policy requirement (length < 8, missing uppercase, missing lowercase, missing number, missing special char, contains email username, in leaked database), THEN Auth_System SHALL reject with HTTP status code 400, and IF password meets all requirements, THEN Auth_System SHALL accept the password.

**Validates: Requirement 2.3, 2.4, 2.5**

**Rationale:** Password policy must be consistently enforced. The same password should always be accepted or rejected regardless of when it's submitted.

### Property 11: Session Expiration Correctness

FOR ALL user sessions in `gateway.user_sessions`, WHEN current timestamp exceeds `expires_at`, THEN Auth_System SHALL reject authentication attempts using that session's Refresh_Token with HTTP status code 401.

**Validates: Requirement 8**

**Rationale:** Time-based expiration must be strictly enforced. Expired sessions must never grant access regardless of token validity.


### Property 12: Blocked User Access Prevention

FOR ALL user accounts with status `blocked`, ANY authentication attempt (login, token refresh, password reset) SHALL fail with HTTP status code 403, regardless of credential validity.

**Validates: Requirement 17**

**Rationale:** Account blocking must be absolute. Blocked users must have zero access paths into the system.

### Property 13: Cookie Security Flags Consistency

FOR ALL authentication cookies set by Auth_System (JWT_Access_Token, Refresh_Token), the cookies SHALL have flags: `HttpOnly=true`, `Secure=true`, `SameSite=Strict` in production environment.

**Validates: Requirements 4.7, 28.9**

**Rationale:** Cookie security flags must be consistently applied to prevent XSS and CSRF attacks. Missing flags create security vulnerabilities.

### Property 14: Input Validation Metamorphic Property

FOR ALL API endpoints accepting user input, IF input is valid according to validation rules, THEN Auth_System SHALL process the request and return status code 200-299, and IF input is invalid, THEN Auth_System SHALL return status code 400 with validation error details.

**Validates: Requirement 30**

**Rationale:** Input validation must have binary outcomes: valid inputs are processed, invalid inputs are rejected with clear errors. No undefined behavior.


### Property 15: Concurrent Session Limit Enforcement

FOR ALL users, WHEN the number of active sessions exceeds 3, THEN Auth_System SHALL automatically terminate the oldest session before creating a new session, maintaining the invariant: active_session_count ≤ 3.

**Validates: Requirement 14.12**

**Rationale:** Concurrent session limits must be strictly enforced to prevent resource exhaustion and unauthorized access patterns.

### Property 16: 2FA Requirement for Admin Role

FOR ALL users with role `admin`, IF 2FA is not enabled, THEN any attempt to grant admin role SHALL fail with HTTP status code 400, and IF 2FA is enabled, THEN admin role grant SHALL succeed.

**Validates: Requirements 11.14, 16.7, 16.8**

**Rationale:** Admin privilege escalation must require 2FA. This security invariant prevents privilege escalation without enhanced authentication.

### Property 17: OAuth Email Verification Auto-Confirmation

FOR ALL user accounts created via OAuth_Provider (Google, Facebook, GitHub), the `auth.users.email_confirmed_at` SHALL be automatically set to non-null timestamp, bypassing manual verification.

**Validates: Requirement 5.8**

**Rationale:** OAuth providers verify emails, so manual verification is redundant. This property ensures consistent email verification state.


### Property 18: Security Event Logging Completeness

FOR ALL authentication failures (invalid credentials, rate limit exceeded, blocked account, expired token), THEN Auth_System SHALL log security event with fields: event_type, timestamp, ip_address, user_identifier (email or userId).

**Validates: Requirements 4.11, 23.8**

**Rationale:** Security monitoring requires complete event logging. Every authentication failure must be auditable for incident response.

### Property 19: User Enumeration Prevention

FOR ALL authentication and password reset endpoints, WHEN email does not exist in system, THEN Auth_System SHALL return same response format and timing as when email exists, preventing user enumeration through response analysis.

**Validates: Requirements 4.12, 10.6**

**Rationale:** Timing attacks can reveal valid user emails. This property ensures response behavior is indistinguishable for existing and non-existing users.

### Property 20: Admin Self-Modification Prevention

FOR ALL admin operations (role change, block, delete), WHEN target userId equals authenticated admin userId, THEN Auth_System SHALL reject with HTTP status code 403.

**Validates: Requirements 16.9, 17.11, 18.12**

**Rationale:** Self-modification creates security risks (privilege escalation, self-unblocking). This property prevents admins from modifying their own accounts.


## Non-Functional Requirements

### Performance

1. **Authentication Response Time:**
   - Login (email/password): < 500ms on localhost, < 1s on cloud
   - Token refresh: < 100ms on localhost, < 300ms on cloud
   - OAuth authentication: < 2s total flow time
   - OTP generation and sending: < 3s
   - Database queries: < 50ms for user lookups

2. **Admin Dashboard Load Time:**
   - User management page: < 2s for initial load
   - Analytics dashboard: < 3s with chart rendering
   - System logs page: < 2s for paginated results

3. **Throughput:**
   - Support 100 concurrent users on localhost (demo)
   - Support 10,000 concurrent users on cloud deployment
   - Handle 1000 authentication requests per minute

### Scalability

1. **Horizontal Scaling:**
   - Backend API can run multiple instances behind load balancer
   - Stateless authentication using JWT (no server-side session storage except refresh tokens)
   - Database connection pooling supports increased load

2. **Data Growth:**
   - Support 100,000+ user accounts
   - Support 1,000,000+ chat sessions
   - Support 10,000+ admin log entries with efficient querying

3. **Session Management:**
   - Redis or in-memory cache for rate limiting scales with traffic
   - Automatic session cleanup prevents unbounded growth


### Reliability

1. **Uptime:**
   - Backend API: 99.9% uptime in production
   - Supabase Auth: 99.9% uptime (per Supabase SLA)
   - Email delivery: 99% delivery rate within 5 minutes

2. **Fault Tolerance:**
   - Graceful degradation when external services (OAuth providers, SMS gateway) are unavailable
   - Database connection retry logic (1 retry with exponential backoff)
   - Email sending failures logged without blocking user registration

3. **Data Integrity:**
   - Foreign key constraints ensure referential integrity
   - UNIQUE constraints prevent duplicate accounts
   - Transaction support for multi-table operations

### Security

1. **Authentication Security:**
   - Bcrypt password hashing with cost factor 12
   - JWT tokens with 15-minute access token expiration
   - Refresh token rotation on every refresh
   - httpOnly, Secure, SameSite cookies

2. **Authorization Security:**
   - Role-based access control on all protected routes
   - 2FA required for admin accounts
   - Rate limiting on all authentication endpoints

3. **Data Security:**
   - HTTPS enforcement in production
   - Comprehensive security headers (HSTS, CSP, X-Frame-Options)
   - SQL injection prevention via parameterized queries
   - XSS prevention via input sanitization

4. **Monitoring:**
   - Security event logging for all authentication failures
   - Admin action audit trail
   - Rate limit violation tracking


### Maintainability

1. **Code Organization:**
   - Clear separation of concerns: Controllers, Services, Repositories
   - Consistent error handling with global exception middleware
   - Comprehensive logging for debugging

2. **API Documentation:**
   - OpenAPI/Swagger documentation for all endpoints
   - Clear error codes and messages
   - Example requests and responses

3. **Testing:**
   - Property-based tests for correctness properties
   - Integration tests for authentication flows
   - Unit tests for validation logic
   - End-to-end tests for user journeys

4. **Configuration Management:**
   - Environment-based configuration (development, production)
   - Secrets stored in environment variables, not in code
   - Feature flags for gradual rollout

### Usability

1. **User Experience:**
   - Real-time validation feedback in forms
   - Clear error messages in user's language
   - Password strength indicator
   - Loading states and progress indicators

2. **Accessibility:**
   - ARIA labels for screen readers
   - Keyboard navigation support
   - Focus management for form fields
   - Sufficient color contrast (WCAG AA compliant)

3. **Responsive Design:**
   - Mobile-first approach
   - Optimized for screens from 320px to 1920px width
   - Touch-friendly buttons (minimum 44x44px)


### Compatibility

1. **Browser Support:**
   - Chrome 120+ (desktop and mobile)
   - Firefox 120+ (desktop and mobile)
   - Safari 17+ (desktop and iOS)
   - Edge 120+ (desktop)

2. **Operating Systems:**
   - Windows 10+ for development and deployment
   - macOS 12+ for development
   - Linux (Ubuntu 20.04+) for cloud deployment
   - iOS 16+ and Android 12+ for mobile browsers

3. **Technology Stack:**
   - Frontend: Next.js 14+ with App Router
   - Backend: ASP.NET Core 9 or .NET 8
   - Database: PostgreSQL 14+ (Supabase)
   - Node.js: 18.x or higher for frontend development

### Compliance

1. **GDPR Compliance:**
   - User data export functionality
   - Right to be forgotten (account deletion)
   - Data minimization (collect only necessary data)
   - Consent management for data processing

2. **Security Standards:**
   - OWASP Top 10 protection
   - Password hashing per NIST guidelines
   - JWT implementation per RFC 7519
   - TOTP implementation per RFC 6238

3. **Data Retention:**
   - Active user data: retained indefinitely
   - Deleted user data: anonymized after 30 days
   - Audit logs: retained for 1 year
   - Security events: retained for 90 days


### Deployment

1. **Development Environment:**
   - Frontend: localhost:3000 (Next.js dev server)
   - Backend: localhost:5000 (HTTP), localhost:5001 (HTTPS)
   - Database: Supabase cloud (development project)
   - CORS: Enabled for localhost cross-origin requests

2. **Production Environment:**
   - Frontend: Cloudflare Pages or Vercel (with automatic deployments from Git)
   - Backend: Cloud hosting (Azure, AWS, or Docker containers)
   - Database: Supabase cloud (production project with backups)
   - CORS: Configured for production frontend domain

3. **CI/CD Pipeline:**
   - Automated testing on pull requests
   - Automated deployment on merge to main branch
   - Database migrations applied automatically
   - Environment-specific configuration injection

4. **Monitoring and Logging:**
   - Application Performance Monitoring (APM)
   - Error tracking (Sentry or similar)
   - Log aggregation (ELK stack or cloud logging)
   - Uptime monitoring and alerting


## Integration Points

### Supabase Auth Integration

1. **Authentication Methods:**
   - `auth.sign_up()` for email/password registration
   - `auth.sign_in_with_password()` for email/password login
   - `auth.sign_in_with_oauth()` for social login (Google, Facebook, GitHub)
   - `auth.sign_in_with_otp()` for email/SMS OTP authentication

2. **User Management:**
   - `auth.users` table stores authentication data
   - Supabase handles email sending for verification
   - Supabase provides JWT token generation

3. **Storage Integration:**
   - `avatars` bucket for user profile images
   - `products` bucket for product images (reusing from System 1)

### Frontend-Backend Communication

1. **API Client:**
   - Fetch API with automatic token inclusion from cookies
   - Error handling with retry logic
   - Request timeout (10 seconds)

2. **State Management:**
   - React Context or Zustand for auth state
   - Persistent storage in httpOnly cookies (not localStorage)

3. **Route Protection:**
   - Next.js middleware for route guarding
   - Client-side role checks for UI rendering
   - Server-side authorization in API routes

### External Services

1. **Email Service:**
   - Supabase email templates for verification, password reset
   - SMTP configuration for transactional emails
   - Email queue for reliability

2. **SMS Service:**
   - Twilio API for SMS OTP delivery
   - Fallback to Supabase Edge Functions if Twilio unavailable
   - Phone number validation before sending

3. **OAuth Providers:**
   - Google OAuth 2.0 for Google login
   - Facebook Login for Facebook authentication
   - GitHub OAuth App for GitHub login


## Future Enhancements (Out of Scope)

The following features are not included in this specification but may be considered for future iterations:

1. **Advanced 2FA Options:**
   - Biometric authentication (fingerprint, face recognition)
   - Hardware security keys (FIDO2/WebAuthn)
   - SMS-based 2FA as alternative to TOTP

2. **Social Features:**
   - User profiles with bio and social links
   - Follow/unfollow other users
   - Public/private profile settings

3. **Advanced Admin Features:**
   - Bulk user operations (import, export, bulk role assignment)
   - Custom user groups and permissions
   - Advanced analytics with custom date ranges and filters
   - Real-time dashboard updates with WebSocket

4. **Enhanced Security:**
   - Suspicious activity detection with machine learning
   - Geolocation-based access control
   - Device fingerprinting for fraud detection
   - Login notifications via email/SMS

5. **User Experience:**
   - Single Sign-On (SSO) with SAML/OIDC
   - Social account linking (multiple OAuth providers per account)
   - Account recovery via security questions
   - Passwordless magic link authentication

6. **Compliance:**
   - CCPA compliance features
   - HIPAA compliance for healthcare data
   - Multi-tenant architecture for enterprise customers
   - Advanced audit logging with tamper detection

## Summary

This requirements document defines a comprehensive authentication and user management system with:

- **30 detailed requirements** covering authentication methods, user management, admin features, and security
- **20 correctness properties** for property-based testing validation
- **Multiple authentication methods**: Email/password, OAuth (Google/Facebook/GitHub), OTP via email/SMS
- **Role-based access control**: Guest, Customer, Admin roles with appropriate permissions
- **Security features**: 2FA, rate limiting, password policies, security headers, audit logging
- **Admin dashboard**: User management, product CRUD, analytics, system logs
- **GDPR compliance**: Data export, right to be forgotten
- **Multi-language support**: English and Vietnamese
- **Integration**: Supabase Auth, Next.js frontend, ASP.NET Core backend

The system is designed to be secure, scalable, and maintainable while providing an excellent user experience across desktop and mobile devices.
