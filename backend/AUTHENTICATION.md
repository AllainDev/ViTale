# 🔐 Authentication System - ViTale Platform

## Overview

ViTale platform hỗ trợ 2 phương thức đăng ký/đăng nhập:
1. **OAuth 2.0** - Google, Facebook
2. **Email/Password** - Traditional authentication với email verification

---

## 🎯 Features

### Email/Password Authentication

✅ **Strong Password Validation**
- Tối thiểu 8 ký tự
- Chữ hoa (A-Z)
- Chữ thường (a-z)
- Số (0-9)
- Ký tự đặc biệt (!@#$%^&*(),.?":{}|<>)

✅ **Email Validation**
- Format validation (RFC 5322)
- DNS MX record check
- Disposable email blocking
- Domain existence verification

✅ **Email Verification**
- Gửi link xác thực sau khi đăng ký
- Token hết hạn sau 24 giờ
- Phải verify email trước khi login
- Gửi lại email verification nếu cần

✅ **Password Reset**
- Forgot password flow
- Token hết hạn sau 2 giờ
- One-time use token
- Email notification

✅ **Security**
- BCrypt password hashing (workFactor: 12)
- Secure random tokens
- Account locking mechanism
- JWT with 7-day expiry
- HttpOnly cookies

---

## 📡 API Endpoints

### 1. Register with Email/Password

**POST** `/api/v1/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "Nguyễn Văn A"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account."
}
```

**Validation Errors (400):**
```json
{
  "error": "Invalid email format or disposable email not allowed"
}
```

```json
{
  "errors": {
    "Password": [
      "Password must contain at least one uppercase letter",
      "Password must contain at least one special character"
    ]
  }
}
```

**Conflict (409):**
```json
{
  "error": "Email already registered"
}
```

---

### 2. Verify Email

**GET** `/api/v1/auth/verify-email?token={token}`

**Response:**
- Redirects to frontend: `http://localhost:3000/auth/verify-success`
- Gửi welcome email sau khi verify thành công

**Errors:**
- `400 Bad Request` - Invalid or expired token

---

### 3. Login with Email/Password

**POST** `/api/v1/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-07-17T10:30:00Z",
  "traveler": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "isRegistered": true
  }
}
```

**Sets Cookie:**
```
vitale_jwt={jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=7days
```

**Errors:**
- `401 Unauthorized` - Invalid credentials
- `401 Unauthorized` - Account locked
- `401 Unauthorized` - Email not verified

---

### 4. Forgot Password

**POST** `/api/v1/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If your email is registered, you will receive a password reset link."
}
```

**Note:** Always returns success để tránh email enumeration

---

### 5. Reset Password

**POST** `/api/v1/auth/reset-password`

**Request Body:**
```json
{
  "token": "abc123def456...",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

**Errors:**
- `400 Bad Request` - Invalid or expired token
- Validation errors nếu password không đủ mạnh

---

### 6. Resend Verification Email

**POST** `/api/v1/auth/resend-verification`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If your email is not verified, you will receive a verification link."
}
```

---

### 7. OAuth Login (Google/Facebook)

**GET** `/api/v1/auth/login/{provider}`
- `provider`: `google` hoặc `facebook`
- Redirects to OAuth provider

**Callback:** `/api/v1/auth/callback`
- Tự động xử lý OAuth callback
- Tạo/link account
- Redirect về frontend với JWT

---

### 8. Refresh Token

**POST** `/api/v1/auth/refresh`

Đọc JWT từ cookie `vitale_jwt` hoặc Authorization header, issue token mới.

**Response (200 OK):**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-07-17T10:30:00Z"
}
```

---

## 🔧 Environment Variables

Add these to your `.env` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@vitale.com
SMTP_FROM_NAME=ViTale

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000

# OAuth
OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
OAUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_FACEBOOK_APP_ID=your_facebook_app_id
OAUTH_FACEBOOK_APP_SECRET=your_facebook_app_secret
```

---

## 📧 Email Templates

### 1. Email Verification
- **Subject:** "Xác thực email của bạn - ViTale"
- **Contains:** Verification link (expires in 24h)
- **Design:** Professional HTML with gradient header

### 2. Password Reset
- **Subject:** "Đặt lại mật khẩu - ViTale"
- **Contains:** Reset link (expires in 2h)
- **Design:** Security-focused with warning box

### 3. Welcome Email
- **Subject:** "Chào mừng bạn đến với ViTale! 🎉"
- **Contains:** Platform features overview
- **Design:** Engaging with feature cards

---

## 🗄️ Database Schema

### PassportAccount Table

```sql
CREATE TABLE passport_accounts (
  id UUID PRIMARY KEY,
  
  -- OAuth fields (nullable)
  oauth_provider VARCHAR(20),
  oauth_user_id VARCHAR(100),
  
  -- Email/Password fields
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(100),
  full_name VARCHAR(100),
  
  -- Email verification
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(50),
  email_verification_token_expires_at TIMESTAMP,
  
  -- Password reset
  password_reset_token VARCHAR(50),
  password_reset_token_expires_at TIMESTAMP,
  
  -- Account status
  created_at TIMESTAMP NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX idx_passport_accounts_email ON passport_accounts(email);
CREATE INDEX idx_passport_accounts_provider_uid ON passport_accounts(oauth_provider, oauth_user_id);
CREATE INDEX idx_passport_accounts_email_verification_token ON passport_accounts(email_verification_token);
CREATE INDEX idx_passport_accounts_password_reset_token ON passport_accounts(password_reset_token);
```

---

## 🔒 Security Best Practices

### Password Hashing
- BCrypt với workFactor = 12
- Không bao giờ store plain text passwords
- Verify passwords bằng BCrypt.Verify()

### Token Security
- Email verification tokens: 32-character hex (Guid.NewGuid().ToString("N"))
- Password reset tokens: 32-character hex
- Tokens expire sau thời gian nhất định
- One-time use (deleted sau khi dùng)

### Email Enumeration Prevention
- Forgot password luôn return success
- Resend verification luôn return success
- Không reveal account existence

### Account Security
- Lock accounts sau multiple failed attempts (chưa implement)
- Track last login time
- Email notifications cho security events (chưa implement)

### JWT Security
- 7-day expiry
- HttpOnly cookies
- Secure flag in production
- SameSite=Lax

---

## 🧪 Testing

### Test Valid Registration
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "fullName": "Test User"
  }'
```

### Test Invalid Password
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "fullName": "Test User"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

---

## 📝 Migration

Run migration to add new columns:
```bash
cd backend
dotnet ef migrations add AddEmailPasswordAuthentication --project Infrastructure --startup-project WebApi
dotnet ef database update --project Infrastructure --startup-project WebApi
```

---

## 🚀 Next Steps / Future Enhancements

- [ ] Rate limiting cho auth endpoints
- [ ] Account lockout sau multiple failed login attempts
- [ ] Two-factor authentication (2FA)
- [ ] Email notifications cho security events
- [ ] Password strength meter trong frontend
- [ ] Social login với Apple
- [ ] Remember me functionality
- [ ] Session management dashboard

---

## 📚 Dependencies

- **BCrypt.Net-Next** (v4.2.0) - Password hashing
- **System.IdentityModel.Tokens.Jwt** - JWT generation
- **System.Net.Mail** - SMTP email sending
- **FluentValidation** - Request validation

---

## 🐛 Troubleshooting

### SMTP Not Configured
If SMTP environment variables are not set, emails will be logged to console instead of sent.

### Email Verification Link Not Working
- Check FRONTEND_URL environment variable
- Ensure token is exactly 32 characters
- Token expires after 24 hours

### Password Reset Not Working
- Token expires after 2 hours
- Tokens are one-time use only
- Check email is verified

---

## 📞 Support

Nếu có vấn đề, check logs tại `/var/log/vitale/` hoặc console output.

**Happy Coding! 🎉**
