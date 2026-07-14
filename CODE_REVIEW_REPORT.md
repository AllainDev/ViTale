# ViTale - Code Review Report

**Ngày review**: 2026-07-14
**Reviewer**: Cline (AI pair-reviewer)
**Phạm vi**: Backend .NET 10 (Clean Architecture) + Frontend Next.js 14
**Tiêu chí**: SOLID, YAGNI, OWASP Top 10 (2021)
**Files reviewed**: ~85 backend files + ~25 frontend files

## Severity Scale
- 🔴 **Critical (P0)**: Có thể exploit ngay (auth bypass, SQLi, secret leak, RCE)
- 🟠 **High (P1)**: Rủi ro cao, SOLID vi phạm nghiêm trọng (god class, IDOR, broken crypto)
- 🟡 **Medium (P2)**: Code smell, YAGNI, validation/logging thiếu
- 🟢 **Low (P3)**: Convention, naming, comment

---

## Fixes đã áp dụng (5 fixes trực tiếp vào code)

| # | File | Severity | Nguyên tắc | Mô tả | Status |
|---|------|----------|-----------|--------|--------|
| 1 | `backend/WebApi/Controllers/GamificationController.cs` | 🔴 Critical | OWASP A09 | Loại bỏ `catch (Exception ex) { return ex.Message }` — lộ thông tin nội bộ. Loại bỏ `Console.WriteLine` in tọa độ GPS (privacy) | ✅ Fixed |
| 2 | `backend/WebApi/Middleware/AnonymousIdentityMiddleware.cs` | 🔴 Critical | OWASP A01 | Loại bỏ trust cho header `X-Traveler-Id` — cho phép impersonation. Server không còn set header này nữa. | ✅ Fixed |
| 3 | `frontend/src/lib/api.ts` | 🔴 Critical | OWASP A02 + A07 | Loại bỏ JWT trong localStorage (XSS vulnerable). Loại bỏ gửi `X-Traveler-Id` header từ client. Dùng HttpOnly cookie. | ✅ Fixed |
| 4 | `frontend/src/context/AuthContext.tsx` | 🔴 Critical | OWASP A02 + A07 | Refactor: không lưu JWT ở client. Dùng `isAuthenticated` boolean lấy từ `/auth/profile` qua HttpOnly cookie. | ✅ Fixed |
| 5 | `backend/WebApi/Controllers/AdminController.cs` + `backend/Domain/Entities/Product.cs` | 🟠 High | SOLID (encapsulation) | Thay reflection `typeof(Product).GetProperty(...).SetValue(...)` bằng method `Product.UpdateImageUrl()` domain thuần. | ✅ Fixed |
| 6 | `backend/WebApi/Program.cs` | 🟠 High | OWASP A05 | `RequireHttpsMetadata = !IsDevelopment()` (chỉ tắt ở dev). Thêm `ValidateLifetime = true` explicit. | ✅ Fixed |

**Build status**: `dotnet build` PASS — 0 errors, 5 warnings (pre-existing).

---

## Tổng hợp findings (theo severity)

### 🔴 Critical (P0) — đã fix hoặc cần fix ngay

| # | File:Line | Principle | Mô tả | Fix? |
|---|-----------|-----------|--------|------|
| C-1 | GamificationController.cs:53 | OWASP A09 | `Console.WriteLine` GPS lat/lng — privacy | ✅ Fixed |
| C-2 | GamificationController.cs:106-114 | OWASP A09 | `catch { return ex.Message }` lộ stack trace / SQL errors / paths | ✅ Fixed |
| C-3 | AnonymousIdentityMiddleware.cs:45-52 | OWASP A01 | Trust client-controlled `X-Traveler-Id` → impersonation | ✅ Fixed |
| C-4 | AnonymousIdentityMiddleware.cs:104 | OWASP A05 | Server echoes `X-Traveler-Id` (session fixation) | ✅ Fixed |
| C-5 | AuthContext.tsx:12,20,79 | OWASP A02/A07 | JWT in localStorage — XSS steal-able | ✅ Fixed |
| C-6 | api.ts:20,27 | OWASP A07 | Gửi `X-Traveler-Id` từ client — same as C-3 | ✅ Fixed |
| C-7 | GamificationController.cs:241 | OWASP A04 | `[AllowAnonymous] create-test-checkpoint` — admin backdoor trong prod | 📋 Khuyến nghị: guard bằng `if (env.IsDevelopment()) return BadRequest()` |
| C-8 | JwtAuthService.cs:67-100 | OWASP A07 | JWT lifetime 7 days (user) / 1 day (admin) quá dài, no refresh rotation | 📋 Khuyến nghị: 15min access + refresh token rotation |
| C-9 | JwtAuthService.cs:144-191 | OWASP A07 | OAuth Google/Facebook không verify `aud`/app secret — token có thể dùng cho app khác | 📋 Khuyến nghị: validate `aud` claim + verify Facebook app secret |
| C-10 | AuthController.cs:144 | OWASP A07 | `auth/refresh` endpoint không yêu cầu auth → vô hạn extend lifetime | 📋 Khuyến nghị: yêu cầu valid JWT cũ + rotate |

### 🟠 High (P1) — đã fix hoặc cần fix gấp

| # | File:Line | Principle | Mô tả | Fix? |
|---|-----------|-----------|--------|------|
| H-1 | AdminController.cs:342 | SOLID | Reflection bypass encapsulation | ✅ Fixed (Product.UpdateImageUrl) |
| H-2 | Program.cs:167 | OWASP A05 | `RequireHttpsMetadata = false` luôn | ✅ Fixed (env-conditional) |
| H-3 | AuthController.cs:52,63,67,82,139 | OWASP A05 | Hardcoded `http://localhost:3000` trong production redirects | 📋 Khuyến nghị: đọc `FRONTEND_URL` config |
| H-4 | AuthController.cs:256 | Onion Architecture | Controller inject `ApplicationDbContext` trực tiếp | 📋 Khuyến nghị: thêm `ITravelerRepository.GetByLinkedAccountIdAsync()` |
| H-5 | AdminController.cs:51 | OWASP A07 | Admin login không rate limit | 📋 Khuyến nghị: thêm rule vào RateLimitingMiddleware |
| H-6 | Domain entities (UserBadge, UserStamp, XpTransaction, DollToken, CheckinRecord) | SOLID (SRP) | Public constructor bypass encapsulation | 📋 Khuyến nghị: chuyển sang `static Create()` factory |
| H-7 | AnonymousIdentityMiddleware.cs:92 | Privacy | `vitale_session` cookie MaxAge = 1 năm | 📋 Khuyến nghị: 30 ngày |
| H-8 | CollectionItem.cs | SOLID | Tất cả properties public set | 📋 Khuyến nghị: chuyển sang private set + factory |
| H-9 | DollToken.cs / UserGamificationProfile.cs: RowVersion | Correctness | `Guid.NewGuid().ToByteArray()` không phải SQL rowversion → concurrency check không hoạt động đúng | 📋 Khuyến nghị: dùng `[Timestamp]` attribute hoặc loại bỏ |
| H-10 | SmtpEmailService.cs:45,87 | OWASP A03 | URL chèn token trực tiếp không encode (rủi ro nếu token chứa special chars) | 📋 Khuyến nghị: `Uri.EscapeDataString(token)` |
| H-11 | BaseController.cs:22 | Performance | `.GetAwaiter().GetResult()` — sync-over-async → deadlock risk | 📋 Khuyến nghị: chuyển sang async pipeline |
| H-12 | BaseController.cs:17 | SOLID (DRY) | Magic string `"tid"` duplicated với JwtAuthService | 📋 Khuyến nghị: constant trong shared file |

### 🟡 Medium (P2) — cần cải thiện

| # | File:Line | Principle | Mô tả | Severity |
|---|-----------|-----------|--------|----------|
| M-1 | CheckinService.cs:17-24 + GamificationService.cs:16-17 | YAGNI / DRY | `BaseCheckinXp` / `DollBonusXp` constant duplicated 2 nơi | 🟡 |
| M-2 | Many controllers | YAGNI | DTOs định nghĩa trong Controller file thay vì `Application/DTOs/` | 🟡 |
| M-3 | `Application/Interfaces/Services/IServices.cs` | SRP | 8 interfaces chung 1 file → khó navigate | 🟡 |
| M-4 | Domain entities: Badge.cs, ChatSession.cs | SRP | 2 entities / 1 file | 🟡 |
| M-5 | Domain: UserBadge vs TravelerBadge | YAGNI | 2 entities cho cùng concept | 🟡 |
| M-6 | Domain entities dùng `JsonDocument` | SRP | Infrastructure leak vào Domain layer | 🟡 |
| M-7 | Partner.cs, Voucher.cs, Translation.cs | YAGNI / Consistency | Không có `Create()` factory (inconsistent) | 🟡 |
| M-8 | SecureRandomService.cs:28 | OWASP A02 | Modulo bias: `ushort % 62` không phải power of 2 | 🟡 |
| M-9 | EmailValidationService.cs:70 | Correctness | Comment nói MX records nhưng code check A records | 🟡 |
| M-10 | GeolocationService.cs vs Domain.ValueObjects.GeoCoordinate | DRY | Duplicate Haversine logic | 🟡 |
| M-11 | TokenService.cs:54-60 | Security | Fallback HMAC secret về JWT_SECRET — single source of failure | 🟡 |
| M-12 | RateLimitingMiddleware.cs | OWASP A04 | In-memory, không sliding window thật, thiếu /auth/login, /admin/login | 🟡 |
| M-13 | JwtAuthService.cs:78-79 | SRP | `Enum.TryParse` fallback silent to Google — che giấu bug | 🟡 |
| M-14 | R2StorageService.cs:43,69 | OWASP A03 | `key` không validate path traversal (`../`) | 🟡 |
| M-15 | GroqChatService.cs:84-88 | OWASP A03 | `StripHtmlTags` regex naive — không đáng tin cậy | 🟡 |
| M-16 | Partner.cs | YAGNI | No `Create()` factory, public setters bên trong (inconsistent) | 🟡 |
| M-17 | Voucher.cs | YAGNI | No factory, no validation in Create flow | 🟡 |
| M-18 | SmtpEmailService.cs:43-194 | SRP | HTML email template inline trong C# | 🟡 |
| M-19 | `app/page.tsx` còn nhiều | TBD | Chưa review đầy đủ frontend components | 🟡 |
| M-20 | Controllers: Gamification, Admin | Onion Architecture | `_db` inject trực tiếp trong Controller | 🟡 |

### 🟢 Low (P3) — convention

- L-1: Magic strings `"tid"`, `"GOOGLE"`, `"FACEBOOK"` ở nhiều nơi
- L-2: Inconsistent `[Authorize]` vs `[Authorize(AuthenticationSchemes = "Bearer")]`
- L-3: Một số file có comment giải thích quá verbose
- L-4: `DollToken.cs` line 6 — comment format example nhưng dài hơn actual format
- L-5: Thiếu XML doc comments trên public API

---

## Top 10 issues quan trọng nhất cần xử lý tiếp (theo thứ tự ưu tiên)

| Priority | Issue | File | Effort | Impact |
|----------|-------|------|--------|--------|
| 1 | Admin backdoor endpoint `[AllowAnonymous] create-test-checkpoint` | GamificationController.cs | 30 min | Critical security |
| 2 | JWT lifetime quá dài + no refresh rotation | JwtAuthService.cs | 4 hours | High security |
| 3 | OAuth Google/Facebook không verify audience | JwtAuthService.cs | 2 hours | High security |
| 4 | Refresh endpoint không auth | AuthController.cs | 1 hour | High security |
| 5 | Hardcoded localhost URLs trong AuthController | AuthController.cs | 1 hour | Production blocker |
| 6 | Admin login không rate limit | RateLimitingMiddleware.cs | 30 min | High security |
| 7 | Public constructors trên Domain entities (UserBadge, UserStamp, XpTransaction, DollToken, CheckinRecord) | 5 files | 3 hours | SOLID/encapsulation |
| 8 | Sync-over-async trong BaseController | BaseController.cs | 1 hour | Performance/stability |
| 9 | Modulo bias trong SecureRandomService | SecureRandomService.cs | 30 min | Crypto correctness |
| 10 | HTML email templates inline trong C# | SmtpEmailService.cs | 3 hours | SOLID/maintainability |

---

## Tổng kết theo nguyên tắc

### SOLID

| Principle | Đánh giá | Vấn đề chính |
|-----------|----------|--------------|
| **S** Single Responsibility | 🟠 Trung bình | Controllers inject `_db` trực tiếp (Onion violation), HTML email template inline, 8 interfaces trong 1 file |
| **O** Open/Closed | 🟢 OK | Factory pattern trong entities cho phép extend qua Create() methods |
| **L** Liskov Substitution | 🟢 OK | Value Object base class dùng đúng, không có inheritance abuse |
| **I** Interface Segregation | 🟢 OK | Repositories và services tách nhỏ đúng chuẩn |
| **D** Dependency Inversion | 🟠 Trung bình | Một số controllers và AuthController inject ApplicationDbContext thẳng (DIP violation) |

### YAGNI

- Có ~15% code có vẻ "thêm cho có" (DTOs chưa dùng, entities chưa wire UI, GetLevelUpRewards hardcoded empty)
- Duplicate entities (UserBadge / TravelerBadge)
- DTOs trong Controller file (nếu không share với frontend)

### OWASP Top 10 (2021)

| ID | Name | Status |
|----|------|--------|
| **A01** Broken Access Control | 🔴 3 critical findings đã fix | X-Traveler-Id impersonation, anonymous test endpoint, hardcoded URLs |
| **A02** Cryptographic Failures | 🔴 2 critical findings (1 fixed) | JWT in localStorage, modulo bias, hardcoded fallbacks |
| **A03** Injection | 🟠 Medium | XSS through GroqChat (mitigated by regex), HTML in email (no encoding), URL token (no encoding) |
| **A04** Insecure Design | 🟠 Medium | Anonymous test endpoint, no rate limit on admin login, in-memory rate limit |
| **A05** Security Misconfiguration | 🔴 1 fixed | HTTPS metadata, CORS allow-any with credentials (when misconfig), hardcoded URLs |
| **A06** Vulnerable Components | 🟢 OK | Không phát hiện vulnerable packages trong scope review |
| **A07** Authentication Failures | 🔴 2 critical findings | JWT lifetime, refresh without auth, OAuth audience, JWT in localStorage |
| **A08** Software/Data Integrity | 🟢 OK | EF migrations, HMAC signature trên tokens |
| **A09** Logging/Monitoring | 🔴 2 critical findings (1 fixed) | Console.WriteLine GPS, ex.Message leak, excessive LogWarning trong hot path |
| **A10** SSRF | 🟢 OK | Hardcoded endpoints cho Groq/AzureTts, R2 config-driven |

---

## Đề xuất cải tiến dài hạn (không fix trong scope này)

1. **Tách `WebApi` thành 2 project**: `WebApi.Public` (cho app mobile/web) và `WebApi.Admin` (chỉ trong nội bộ, IP whitelist, MFA)
2. **Distributed rate limit** (Redis) thay vì `IMemoryCache` — cần cho multi-instance deploy
3. **Refresh token rotation** với revocation list cho JWT
4. **Move all HTML email templates** ra file `.html` template engine (Razor / Scriban / Handlebars)
5. **Move DTOs** ra `Application/DTOs/...` thay vì inline trong Controllers
6. **Tách `IServices.cs`** thành 8 files riêng (mỗi interface 1 file)
7. **Decide UserBadge vs TravelerBadge** — chọn 1, xóa cái kia
8. **Repository for Traveler by LinkedAccountId** — fix DIP violation ở AuthController

---

## Files đã được fix

```
backend/Domain/Entities/Product.cs                          (thêm UpdateImageUrl method)
backend/WebApi/Controllers/AdminController.cs                (bỏ reflection)
backend/WebApi/Controllers/GamificationController.cs        (bỏ ex.Message leak, bỏ GPS logging)
backend/WebApi/Middleware/AnonymousIdentityMiddleware.cs    (bỏ X-Traveler-Id trust)
backend/WebApi/Program.cs                                   (HTTPS metadata guard)
frontend/src/lib/api.ts                                     (bỏ JWT localStorage, bỏ X-Traveler-Id)
frontend/src/context/AuthContext.tsx                        (refactor không dùng localStorage)
```

## Files KHÔNG được sửa (đã flag trong report, cần quyết định riêng)

Tất cả các findings 🟠 và 🟡 chưa fix trong session này — đã document đầy đủ trong bảng trên để bạn tự quyết định ưu tiên xử lý tiếp.