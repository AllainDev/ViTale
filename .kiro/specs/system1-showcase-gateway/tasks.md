# Implementation Plan: System 1 (Showcase & Gateway)

## Overview

Tài liệu này định nghĩa các tác vụ lập trình để triển khai System 1 dựa trên tài liệu requirements và design. Hệ thống bao gồm:
- **Backend**: ASP.NET Core 9 API Gateway (port 5000/5001)
- **Frontend**: Next.js với TypeScript (port 3000)
- **Database**: Supabase PostgreSQL với gateway schema

Mỗi tác vụ tham chiếu đến requirements và design properties cụ thể để đảm bảo tính nhất quán.

## Tasks

### 1. Thiết Lập Database và Schema

- [x] 1.1 Tạo Supabase project và cấu hình kết nối
  - Tạo project mới trên Supabase dashboard
  - Lấy connection string từ project settings
  - Lưu connection string vào biến môi trường `SUPABASE_CONNECTION`
  - _Yêu cầu: 1.1, 6.5_

- [x] 1.2 Tạo gateway schema và products table
  - Thực thi SQL script để tạo schema `gateway`
  - Tạo bảng `gateway.products` với các cột: id (uuid), name (text), description (text), price (numeric), image_url (text), created_at (timestamptz), updated_at (timestamptz)
  - Thiết lập primary key constraint trên cột `id`
  - Thêm CHECK constraint: `price >= 0`
  - Thêm CHECK constraint: `length(name) BETWEEN 1 AND 200`
  - Thêm NOT NULL constraints cho `id`, `name`, `created_at`, `updated_at`
  - _Yêu cầu: 1.1, 1.2, 1.5, 9.1, 9.2, 9.4, 9.5_

- [x] 1.3 Tạo indexes và triggers cho performance
  - Tạo index trên cột `created_at DESC` để tối ưu query sắp xếp theo thời gian
  - Tạo function `update_updated_at_column()` để tự động cập nhật timestamp
  - Tạo trigger `update_products_updated_at` cho BEFORE UPDATE event
  - Thêm comment documentation cho table và columns
  - _Yêu cầu: 1.3, 1.6, 1.7_

- [x] 1.4 Seed dữ liệu test ban đầu
  - Chèn 5-10 sản phẩm mẫu với dữ liệu đa dạng (có và không có imageUrl)
  - Đảm bảo dữ liệu test cover các edge cases: giá = 0, mô tả null, tên dài
  - Verify rằng triggers tự động set created_at và updated_at
  - _Yêu cầu: 1.6, 1.7_


### 2. Thiết Lập Backend Core (ASP.NET Core 9)

- [x] 2.1 Khởi tạo ASP.NET Core 9 project
  - Tạo new Web API project với .NET 9.0 SDK
  - Cấu hình project structure: Controllers/, Models/, Services/, Data/, Middleware/
  - Thêm package references: Dapper, Npgsql, System.Text.Json
  - Cấu hình appsettings.json và appsettings.Development.json
  - Thiết lập ports: 5000 (HTTP) và 5001 (HTTPS)
  - _Yêu cầu: 2.1, 6.4_

- [x] 2.2 Cấu hình connection pooling và dependency injection
  - Đọc connection string từ configuration với key "Supabase"
  - Cấu hình Npgsql connection string với pooling parameters: Pooling=true, Min Pool Size=0, Max Pool Size=10
  - Register IProductRepository và ProductRepository với singleton lifetime
  - Register IProductService và ProductService với scoped lifetime
  - _Yêu cầu: 5.1, 5.3, 11.4_

- [x] 2.3 Implement Product domain model và DTOs
  - Tạo class `Product` với properties: Id (Guid), Name (string), Description (string), Price (decimal), ImageUrl (string?), CreatedAt (DateTime), UpdatedAt (DateTime)
  - Thêm data annotations: [Required], [StringLength(200, MinimumLength = 1)], [Range(0, double.MaxValue)], [Url]
  - Tạo class `ProductDto` với camelCase naming cho JSON serialization
  - Tạo class `ErrorResponse` với properties: Error (string), StatusCode (int), Timestamp (string)
  - _Yêu cầu: 2.5, 2.6, 9.1, 9.2, 9.3_

- [x] 2.4 Implement ProductRepository với Dapper
  - Tạo interface `IProductRepository` với method `Task<IEnumerable<Product>> GetAllAsync()`
  - Implement `ProductRepository` với Dapper queries
  - Viết raw SQL query: `SELECT id, name, description, price, image_url AS ImageUrl, created_at AS CreatedAt, updated_at AS UpdatedAt FROM gateway.products ORDER BY created_at DESC`
  - Implement connection retry logic: catch NpgsqlException, delay 100ms, retry once
  - Log query execution time và connection errors
  - _Yêu cầu: 2.2, 5.1, 5.2, 5.7_


- [x] 2.5 Implement ProductService business logic
  - Tạo interface `IProductService` với method `Task<IEnumerable<ProductDto>> GetAllProductsAsync()`
  - Implement `ProductService` để map từ Product entity sang ProductDto
  - Thực hiện field name transformation: snake_case (DB) → PascalCase (Entity) → camelCase (DTO)
  - Convert DateTime sang ISO 8601 string format
  - _Yêu cầu: 2.6_

- [x] 2.6 Implement ProductsController với GET endpoint
  - Tạo `ProductsController` với route attribute `[Route("api/[controller]")]`
  - Implement GET action method tại path `/api/products`
  - Inject IProductService và ILogger dependencies
  - Measure request processing time với Stopwatch
  - Return Ok(products) cho success case
  - Return 500 error cho exceptions (handled by middleware)
  - Log performance metrics: elapsed time, product count
  - _Yêu cầu: 2.1, 2.3, 2.7, 5.6_

- [x] 2.7 Checkpoint - Test backend core functionality
  - Đảm bảo backend compile thành công
  - Chạy backend và verify endpoint `/api/products` trả về dữ liệu
  - Test với Postman/curl: GET http://localhost:5000/api/products
  - Verify JSON response có đúng format và field names (camelCase)
  - Kiểm tra logs có ghi lại query execution time
  - Hỏi user nếu có vấn đề phát sinh


### 3. Thiết Lập Frontend Core (Next.js)

- [x] 3.1 Khởi tạo Next.js project với TypeScript
  - Tạo new Next.js project với App Router và TypeScript
  - Cấu hình project structure: app/, components/, lib/, public/
  - Thêm dependencies: React, TypeScript, CSS modules
  - Tạo file .env.local với biến `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000`
  - Configure next.config.js cho SSR
  - _Yêu cầu: 3.1, 6.1, 6.2, 6.3_

- [x] 3.2 Tạo TypeScript interfaces và types
  - Tạo file `lib/types.ts`
  - Define interface `Product` với fields: id, name, description, price, imageUrl, createdAt, updatedAt
  - Define interface `ErrorResponse` với fields: error, statusCode, timestamp
  - Define class `APIError extends Error` với statusCode property
  - Export tất cả types
  - _Yêu cầu: 2.5_

- [x] 3.3 Implement API client với error handling
  - Tạo file `lib/api-client.ts`
  - Implement function `fetchProducts(): Promise<Product[]>`
  - Sử dụng AbortController với 10s timeout
  - Thêm try-catch để handle network errors, timeouts, API errors
  - Parse error response và throw APIError với status code
  - Log detailed error information to console (URL, status, error data, timestamp)
  - Sử dụng cache: 'no-store' cho development
  - _Yêu cầu: 3.2, 8.4, 11.6_

- [x] 3.4 Tạo ProductCard component
  - Tạo file `components/ProductCard.tsx`
  - Implement component với props: { product: Product }
  - Hiển thị: image, name, description, price
  - Sử dụng useState để track image loading errors
  - Implement onError handler để fallback về placeholder image
  - Format price với Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
  - Thêm CSS cho card styling (border, padding, hover effect)
  - _Yêu cầu: 3.3, 3.6, 3.7_


- [x] 3.5 Tạo ProductGrid component với responsive layout
  - Tạo file `components/ProductGrid.tsx`
  - Implement component với props: { products: Product[] }
  - Render danh sách ProductCard components
  - Thêm CSS Grid với responsive breakpoints: 1 column (mobile), 2 columns (tablet), 3 columns (desktop), 4 columns (large screens)
  - Sử dụng gap: 1.5rem và padding: 1rem
  - _Yêu cầu: 3.8_

- [x] 3.6 Tạo ErrorMessage và LoadingSpinner components
  - Tạo file `components/ErrorMessage.tsx` với props: { error: APIError | Error, onRetry?: () => void }
  - Implement logic để hiển thị user-friendly messages dựa trên status code (400, 408, 429, 500, 503, network error)
  - Thêm retry button nếu onRetry callback được cung cấp
  - Tạo file `components/LoadingSpinner.tsx` với simple spinner animation
  - Thêm role="alert" cho accessibility
  - _Yêu cầu: 3.4, 3.5, 11.7_

- [x] 3.7 Implement /showcase route với SSR
  - Tạo file `app/showcase/page.tsx`
  - Implement async Server Component để fetch products
  - Call fetchProducts() trong component body
  - Render ProductGrid với products data
  - Thêm error boundary với ErrorMessage component
  - Thêm loading state với LoadingSpinner
  - Thêm empty state khi không có products
  - Thêm page title: "Product Showcase"
  - _Yêu cầu: 3.1, 3.2, 3.3, 6.7_

- [x] 3.8 Thêm responsive CSS styling
  - Tạo file `app/globals.css` với CSS reset và base styles
  - Define CSS Grid breakpoints với media queries: 640px (tablet), 1024px (desktop), 1280px (large)
  - Style product cards: border radius, shadow, hover effects
  - Style error messages: red background, padding, border
  - Style loading spinner: centered, animated
  - Test responsive layout trên các screen sizes
  - _Yêu cầu: 3.8_

- [x] 3.9 Thêm placeholder image cho fallback
  - Tạo hoặc download placeholder-product.png image
  - Đặt image vào thư mục `public/`
  - Verify ProductCard fallback logic sử dụng đúng path: /placeholder-product.png
  - _Yêu cầu: 3.7_

- [x] 3.10 Checkpoint - Test frontend core functionality
  - Đảm bảo frontend build thành công: npm run build
  - Chạy frontend dev server: npm run dev
  - Navigate to http://localhost:3000/showcase
  - Verify products hiển thị trong responsive grid
  - Test image fallback bằng cách break imageUrl
  - Test error handling bằng cách stop backend
  - Test loading state bằng cách throttle network
  - Hỏi user nếu có vấn đề phát sinh


### 4. Implement CORS và Middleware

- [x] 4.1 Cấu hình CORS policy cho localhost development
  - Trong Program.cs, thêm CORS service: builder.Services.AddCors()
  - Define policy "LocalhostDevelopment" với origin: http://localhost:3000
  - Allow all methods: GET, POST, PUT, DELETE, OPTIONS
  - Allow all headers
  - Allow credentials: true
  - Apply middleware: app.UseCors("LocalhostDevelopment")
  - Đảm bảo middleware được add trước app.MapControllers()
  - _Yêu cầu: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.2 Test CORS preflight requests
  - Sử dụng browser DevTools Network tab để verify OPTIONS requests
  - Check response headers: Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers, Access-Control-Allow-Credentials
  - Verify rằng frontend có thể gọi API thành công từ port 3000
  - Test với different HTTP methods (GET, POST)
  - _Yêu cầu: 4.6, 4.7_

- [x] 4.3 Implement Global Exception Handling Middleware
  - Tạo file `Middleware/ExceptionHandlingMiddleware.cs`
  - Implement InvokeAsync method với try-catch cho all exceptions
  - Catch NpgsqlException riêng để log database errors
  - Catch ValidationException để return 400 Bad Request
  - Catch generic Exception để return 500 Internal Server Error
  - Build ErrorResponse với fields: error, statusCode, timestamp (ISO 8601)
  - Log full exception details including stack trace
  - Redact sensitive information (passwords, tokens) trong logs
  - Register middleware trong Program.cs: app.UseMiddleware<ExceptionHandlingMiddleware>()
  - _Yêu cầu: 8.1, 8.2, 8.3, 8.5_


- [x] 4.4 Implement Security Headers Middleware
  - Thêm inline middleware trong Program.cs để set security headers
  - Thêm header: X-Content-Type-Options: nosniff
  - Thêm header: X-Frame-Options: DENY
  - Thêm header: X-XSS-Protection: 1; mode=block
  - Apply middleware cho tất cả responses
  - _Yêu cầu: 12.5_

- [x] 4.5 Implement Rate Limiting Middleware
  - Tạo file `Middleware/RateLimitingMiddleware.cs`
  - Implement in-memory rate limiter: Dictionary<IPAddress, Queue<DateTime>>
  - Limit: 100 requests per minute per IP address
  - Return 429 Too Many Requests với Retry-After header khi vượt limit
  - Log rate limit violations
  - Clean up expired entries định kỳ để tránh memory leak
  - Register middleware trong Program.cs
  - _Yêu cầu: 12.6, 12.7_

- [x] 4.6 Implement Credentials Redaction Helper
  - Tạo file `Helpers/LogHelper.cs`
  - Implement static method `RedactConnectionString(string connectionString)`
  - Parse connection string với NpgsqlConnectionStringBuilder
  - Replace password với "***REDACTED***"
  - Implement static method `RedactSensitiveData(string message)`
  - Sử dụng Regex để redact patterns: password=, token=, api_key=
  - Sử dụng helper trong logging middleware
  - _Yêu cầu: 6.6, 8.2, 8.5_

- [x] 4.7 Configure Structured Logging
  - Cấu hình Logging section trong appsettings.json
  - Set LogLevel.Default = "Information"
  - Set LogLevel."Microsoft.AspNetCore" = "Warning"
  - Set LogLevel."System1.Backend" = "Debug"
  - Verify logs được output ra console với structured format
  - _Yêu cầu: 8.7_


### 5. Implement Input Validation và Security

- [x] 5.1 Thêm validation attributes vào Product model
  - Thêm [Required] attribute cho Name property
  - Thêm [StringLength(200, MinimumLength = 1)] cho Name
  - Thêm [Range(0, double.MaxValue)] cho Price
  - Thêm [Url] attribute cho ImageUrl (nullable)
  - Verify data annotations hoạt động với ModelState validation
  - _Yêu cầu: 9.1, 9.2, 9.3_

- [x] 5.2 Implement validation error handling trong controller
  - Thêm ModelState.IsValid check trong POST/PUT actions (future implementation)
  - Return 400 Bad Request với validation errors khi ModelState invalid
  - Format validation errors thành user-friendly messages
  - Log validation failures với LogLevel.Warning
  - _Yêu cầu: 8.6, 9.6_

- [x] 5.3 Ensure parameterized queries trong repository
  - Review tất cả Dapper queries để đảm bảo sử dụng parameterized queries
  - Không concatenate user input trực tiếp vào SQL strings
  - Sử dụng Dapper parameters: `@paramName` syntax
  - Test với SQL injection strings để verify protection
  - _Yêu cầu: 12.1, 12.2_

- [x] 5.4 Secure environment variable configuration
  - Tạo file .env.example với placeholder values
  - Document tất cả required environment variables
  - Verify connection string KHÔNG được hardcode trong source code
  - Thêm .env vào .gitignore để tránh commit credentials
  - _Yêu cầu: 6.5, 12.3_

- [x] 5.5 Implement browser compatibility detection (Frontend)
  - Thêm useEffect hook trong root layout để detect browser version
  - Check user agent cho Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
  - Display warning message nếu browser không được support
  - Log browser information to console
  - _Yêu cầu: 10.1, 10.2, 10.3, 10.4, 10.6_


### 6. Setup Testing Infrastructure

- [x] 6.1 Setup backend testing framework
  - Thêm xUnit package reference vào backend project
  - Tạo test project: System1.Backend.Tests
  - Thêm package references: xUnit, Moq, FluentAssertions, FsCheck hoặc CsCheck
  - Tạo test structure: Unit/, Integration/, Properties/
  - Configure test runner trong IDE và CLI
  - _Yêu cầu: Testing Strategy_

- [x] 6.2 Setup frontend testing framework
  - Install Jest hoặc Vitest cho unit testing
  - Install @testing-library/react và @testing-library/jest-dom
  - Install fast-check cho property-based testing
  - Configure test scripts trong package.json: `test`, `test:watch`, `test:property`
  - Tạo test setup file với global configurations
  - _Yêu cầu: Testing Strategy_

- [x] 6.3 Create custom generators cho property-based testing (Backend)
  - Tạo file `Tests/Generators/ProductGenerators.cs`
  - Implement generator cho valid Product objects với random data
  - Implement generator cho invalid products (null names, negative prices)
  - Implement generator cho SQL injection strings: `' OR '1'='1`, `'; DROP TABLE--`, etc.
  - Implement generator cho error responses với various status codes
  - Tag each generator với comments về use case
  - _Yêu cầu: Testing Strategy, Property 14_

- [x] 6.4 Create custom generators cho property-based testing (Frontend)
  - Tạo file `lib/__tests__/generators.ts`
  - Implement `productArbitrary()` với fc.record() cho Product interface
  - Implement `errorResponseArbitrary()` cho various status codes
  - Implement `priceArbitrary()` với different magnitudes (0, small, large, very large)
  - Implement `urlArbitrary()` cho valid/invalid/null image URLs
  - Export tất cả generators
  - _Yêu cầu: Testing Strategy, Properties 7, 8_


### 7. Implement Property-Based Tests - Backend

- [x] 7.1 Property Test 1: Product Data Round-Trip Preservation
  - **Property 1: Round-Trip Serialization**
  - **Validates: Requirements 9.6**
  - Tạo file `Tests/Properties/ProductSerializationTests.cs`
  - Implement test: serialize Product to JSON, deserialize back, verify all fields equal
  - Sử dụng ProductGenerators.Products() với 100 iterations
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 1`
  - Verify test catches issues: DateTime precision, null handling, decimal precision

- [x] 7.2 Property Test 2: Price Validation Invariant
  - **Property 2: Price >= 0**
  - **Validates: Requirements 1.5, 9.2**
  - Tạo test trong `Tests/Properties/ProductValidationTests.cs`
  - Generate products với prices từ -10000 đến 10000000
  - Verify tất cả products trong system có price >= 0
  - Test cả database constraint và application validation
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 2`

- [x] 7.3 Property Test 3: API Response Schema Consistency
  - **Property 3: Response Schema**
  - **Validates: Requirements 2.3, 2.5**
  - Tạo test trong `Tests/Properties/ApiResponseTests.cs`
  - Generate random product lists (empty, single, multiple products)
  - Serialize to JSON và parse lại
  - Verify JSON structure contains correct fields với correct types
  - Test với ProductsController mock
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 3`

- [x] 7.4 Property Test 4: Field Name Transformation Consistency
  - **Property 4: snake_case ↔ camelCase**
  - **Validates: Requirements 2.6**
  - Tạo test trong `Tests/Properties/FieldMappingTests.cs`
  - Generate products với various field values
  - Verify database snake_case → entity PascalCase → DTO camelCase
  - Test reverse mapping là bijective (reversible)
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 4`

- [x] 7.5 Property Test 5: Error Response Format Consistency
  - **Property 5: Error Format**
  - **Validates: Requirements 2.4, 8.3, 8.6**
  - Tạo test trong `Tests/Properties/ErrorHandlingTests.cs`
  - Generate different error scenarios: DB error, validation error, rate limit, unhandled exception
  - Verify tất cả error responses có fields: error, statusCode, timestamp
  - Verify timestamp là valid ISO 8601 format
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 5`


- [x] 7.6 Property Test 6: Timestamp Auto-Update Correctness
  - **Property 6: Automatic Timestamps**
  - **Validates: Requirements 1.6, 1.7**
  - Tạo test trong `Tests/Properties/DatabaseTriggerTests.cs`
  - Insert random products vào database
  - Verify created_at được set automatically
  - Update products và verify updated_at changes
  - Run với 50 iterations (database operations are slower)
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 6`

- [x] 7.7 Property Test 9: CORS Preflight Idempotence
  - **Property 9: CORS Idempotence**
  - **Validates: Requirements 4.6**
  - Tạo test trong `Tests/Properties/CorsTests.cs`
  - Generate random OPTIONS requests to API endpoints
  - Send same request multiple times
  - Verify CORS headers are identical across all responses
  - Test với different origins (allowed and disallowed)
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 9`

- [x] 7.8 Property Test 10: Security Header Presence
  - **Property 10: Security Headers**
  - **Validates: Requirements 12.5**
  - Tạo test trong `Tests/Properties/SecurityTests.cs`
  - Generate random HTTP requests to various endpoints
  - Verify all responses contain security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
  - Test với GET, POST, PUT, DELETE methods
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 10`

- [x] 7.9 Property Test 11: Credentials Redaction in Logs
  - **Property 11: Log Redaction**
  - **Validates: Requirements 6.6, 8.2, 8.5**
  - Tạo test trong `Tests/Properties/LoggingTests.cs`
  - Generate error messages chứa sensitive data: passwords, tokens, connection strings
  - Pass through LogHelper.RedactSensitiveData()
  - Verify output KHÔNG chứa plain-text credentials
  - Test với various credential formats
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 11`

- [x] 7.10 Property Test 12: Input Validation Comprehensive Coverage
  - **Property 12: Input Validation**
  - **Validates: Requirements 9.1, 9.2, 9.3**
  - Tạo test trong `Tests/Properties/ValidationTests.cs`
  - Generate invalid products: empty names, names > 200 chars, negative prices, invalid URLs
  - Verify validation logic rejects all invalid inputs
  - Verify validation returns descriptive error messages
  - Test với 100 iterations
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 12`


- [x] 7.11 Property Test 13: Database Constraint Enforcement
  - **Property 13: Database Constraints**
  - **Validates: Requirements 9.4, 9.5**
  - Tạo test trong `Tests/Properties/DatabaseConstraintTests.cs`
  - Attempt to insert products với null required fields (id, name, created_at)
  - Attempt to insert products với duplicate IDs
  - Verify database rejects operations với constraint violation errors
  - Test với 50 iterations
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 13`

- [x] 7.12 Property Test 14: SQL Injection Prevention
  - **Property 14: SQL Injection Protection**
  - **Validates: Requirements 12.1**
  - Tạo test trong `Tests/Properties/SqlInjectionTests.cs`
  - Generate SQL injection attack strings: `' OR '1'='1`, `'; DROP TABLE--`, `1' UNION SELECT`, etc.
  - Pass injection strings as query parameters
  - Verify strings are treated as literals, NOT executed as SQL
  - Verify no database schema changes occur
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 14`

- [x] 7.13 Property Test 15: Rate Limiting Enforcement
  - **Property 15: Rate Limiting**
  - **Validates: Requirements 12.6, 12.7**
  - Tạo test trong `Tests/Properties/RateLimitTests.cs`
  - Simulate 150 requests per minute từ same IP
  - Verify first 100 requests succeed (200 OK)
  - Verify requests 101-150 return 429 với Retry-After header
  - Verify rate limit resets after 1 minute
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 15`

- [x] 7.14 Property Test 16: Connection Retry Behavior
  - **Property 16: Connection Retry**
  - **Validates: Requirements 5.7**
  - Tạo test trong `Tests/Properties/ConnectionRetryTests.cs`
  - Simulate transient database connection failures
  - Verify system retries exactly once (không nhiều hơn)
  - Verify retry includes brief delay (100ms)
  - Verify persistent failures return error after 1 retry
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 16`


### 8. Implement Property-Based Tests - Frontend

- [x] 8.1 Property Test 7: Frontend Price Formatting Consistency
  - **Property 7: Price Formatting**
  - **Validates: Requirements 3.6**
  - Tạo file `lib/__tests__/priceFormatting.test.ts`
  - Generate random prices: 0, 100, 1000, 1000000, 99999999
  - Format với Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
  - Verify formatted string chứa thousand separators và VND symbol
  - Verify format consistency across all price ranges
  - Configure test với numRuns: 100
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 7`

- [x] 8.2 Property Test 8: Image Fallback Reliability
  - **Property 8: Image Fallback**
  - **Validates: Requirements 3.7**
  - Tạo file `components/__tests__/ProductCard.test.tsx`
  - Generate products với imageUrl: null, invalid URL, valid URL
  - Render ProductCard component
  - Simulate image load errors với onError event
  - Verify fallback image (/placeholder-product.png) được hiển thị
  - Verify không có broken image icons
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 8`

- [x] 8.3 Property Test 17: Frontend Error Display Consistency
  - **Property 17: Error Display**
  - **Validates: Requirements 3.4, 8.4**
  - Tạo file `components/__tests__/ErrorMessage.test.tsx`
  - Generate error responses với various status codes: 0, 400, 408, 429, 500, 503
  - Render ErrorMessage component
  - Verify user-friendly message được hiển thị cho mỗi status code
  - Verify detailed error info được log to console
  - Verify retry button appears when onRetry provided
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 17`

- [x] 8.4 Property Test 18: Frontend Product Rendering Completeness
  - **Property 18: Product Rendering**
  - **Validates: Requirements 3.3**
  - Tạo file `components/__tests__/ProductCard.rendering.test.tsx`
  - Generate products với various field combinations: null description, null imageUrl, long names
  - Render ProductCard cho mỗi product
  - Verify tất cả required fields được render: name, description, price, image
  - Verify null values được handle gracefully (không crash)
  - Verify formatted price hiển thị correctly
  - Tag test với comment: `// Feature: system1-showcase-gateway, Property 18`


### 9. Implement Unit Tests và Integration Tests

- [x] 9.1 Backend unit tests cho ProductsController
  - Tạo file `Tests/Unit/ProductsControllerTests.cs`
  - Test: GetProducts returns 200 OK với product list khi service succeeds
  - Test: GetProducts returns 500 error khi service throws exception
  - Test: Controller logs request processing time
  - Use Moq để mock IProductService
  - Verify controller logic handling errors correctly

- [x] 9.2 Backend unit tests cho ProductRepository
  - Tạo file `Tests/Unit/ProductRepositoryTests.cs`
  - Test: GetAllAsync maps database columns to entity properties correctly
  - Test: GetAllAsync sorts products by created_at DESC
  - Test: GetAllAsync retries connection on transient errors
  - Test: GetAllAsync throws exception after failed retry
  - Use in-memory test database hoặc mock Npgsql connection

- [x] 9.3 Backend unit tests cho validation
  - Tạo file `Tests/Unit/ValidationTests.cs`
  - Test: Product model rejects empty name
  - Test: Product model rejects name > 200 characters
  - Test: Product model rejects negative price
  - Test: Product model rejects invalid URL format
  - Test: Product model accepts valid inputs
  - Use data annotations validation

- [x] 9.4 Frontend unit tests cho API client
  - Tạo file `lib/__tests__/api-client.test.ts`
  - Test: fetchProducts returns product array on 200 response
  - Test: fetchProducts throws APIError on 4xx/5xx responses
  - Test: fetchProducts handles network errors gracefully
  - Test: fetchProducts times out after 10 seconds
  - Test: fetchProducts logs errors to console
  - Mock fetch API với jest.fn()


- [x] 9.5 Frontend component tests cho ProductCard
  - Tạo file `components/__tests__/ProductCard.test.tsx`
  - Test: ProductCard renders product name, description, price, image
  - Test: ProductCard displays placeholder when imageUrl is null
  - Test: ProductCard handles image load errors
  - Test: ProductCard formats price with thousand separators
  - Use @testing-library/react

- [x] 9.6 Frontend component tests cho ProductGrid
  - Tạo file `components/__tests__/ProductGrid.test.tsx`
  - Test: ProductGrid renders all products in array
  - Test: ProductGrid applies responsive CSS classes
  - Test: ProductGrid handles empty product array
  - Use @testing-library/react

- [x] 9.7 Frontend component tests cho ErrorMessage
  - Tạo file `components/__tests__/ErrorMessage.test.tsx`
  - Test: ErrorMessage displays user-friendly text for each status code
  - Test: ErrorMessage shows retry button when onRetry provided
  - Test: ErrorMessage calls onRetry when button clicked
  - Test: ErrorMessage handles generic errors without status code

- [x] 9.8 Backend integration test - Full API flow
  - Tạo file `Tests/Integration/ApiFlowTests.cs`
  - Setup: Seed test database với sample products
  - Test: GET /api/products returns products from database
  - Test: Response time < 50ms for queries with < 100 products
  - Test: Response JSON has correct schema và field names
  - Cleanup: Delete test data after test
  - Use WebApplicationFactory<Program> để spin up test server

- [x] 9.9 Backend integration test - Concurrent requests
  - Tạo file `Tests/Integration/ConcurrencyTests.cs`
  - Test: Send 5 concurrent requests to /api/products
  - Verify all requests complete successfully
  - Verify no data corruption or partial results
  - Verify connection pool handles concurrent connections
  - Measure average response time under load

- [x] 9.10 Frontend integration test - Showcase page
  - Tạo file `app/showcase/__tests__/page.test.tsx`
  - Mock fetchProducts API call
  - Test: Page renders ProductGrid when API succeeds
  - Test: Page renders ErrorMessage when API fails
  - Test: Page renders LoadingSpinner during fetch
  - Test: Page renders empty state when no products
  - Use @testing-library/react và mock fetch


### 10. Performance Testing và Optimization

- [x] 10.1 Run performance baseline tests
  - Install K6 load testing tool: `choco install k6` hoặc download từ k6.io
  - Tạo file `tests/performance/load-test.js` với K6 script
  - Configure test: ramp up to 5 CCU, maintain for 1 minute, ramp down
  - Set threshold: 95% of requests < 50ms
  - Run test: `k6 run tests/performance/load-test.js`
  - Document baseline metrics: p50, p95, p99 response times
  - _Yêu cầu: 2.7, 5.5, 11.5_

- [x] 10.2 Verify database query performance
  - Enable query logging trong Supabase dashboard
  - Run /api/products endpoint multiple times
  - Check query execution time trong logs
  - Verify query time < 20ms for tables with < 1000 products
  - Analyze EXPLAIN plan cho SELECT query
  - Confirm index on created_at được sử dụng
  - _Yêu cầu: 1.3, 5.2_

- [x] 10.3 Verify connection pooling efficiency
  - Send 10 rapid sequential requests to /api/products
  - Monitor connection pool metrics trong logs
  - Verify connections được reused (không tạo 10 connections mới)
  - Check pool size stays within configured limits (max 10)
  - Verify no connection leaks
  - _Yêu cầu: 5.3, 11.4_

- [x] 10.4 Frontend performance audit
  - Run Lighthouse audit trên /showcase page
  - Target: Performance score > 90
  - Check First Contentful Paint (FCP) < 1.5s
  - Check Largest Contentful Paint (LCP) < 2.5s
  - Check Time to Interactive (TTI) < 3s
  - Verify no layout shifts (CLS = 0)
  - Document improvement opportunities

- [x] 10.5 Test response time under concurrent load
  - Modify K6 script to send concurrent requests (5 CCU)
  - Measure response time distribution: min, median, p95, max
  - Verify average response time remains < 50ms under load
  - Verify no timeouts or failed requests
  - Document performance results
  - _Yêu cầu: 11.1, 11.2, 11.5_


### 11. Browser Compatibility Testing

- [x] 11.1 Test trên Chrome 120+
  - Navigate to http://localhost:3000/showcase trên Chrome
  - Verify product grid hiển thị correctly
  - Test responsive layout bằng cách resize window
  - Test error handling bằng cách stop backend
  - Test loading states và retry functionality
  - Check console cho errors hoặc warnings
  - Verify CORS requests thành công
  - _Yêu cầu: 10.1_

- [x] 11.2 Test trên Firefox 120+
  - Repeat tất cả test cases từ Chrome trên Firefox
  - Verify fetch API hoạt động correctly
  - Verify CSS Grid rendering correctly
  - Check DevTools Network tab cho CORS headers
  - Verify không có browser-specific issues
  - _Yêu cầu: 10.2_

- [x] 11.3 Test trên Safari 17+
  - Repeat tất cả test cases trên Safari (macOS/iOS)
  - Verify fetch API và AbortController compatibility
  - Verify CSS Grid và responsive layout
  - Test image loading và fallback behavior
  - Check Safari Web Inspector cho errors
  - _Yêu cầu: 10.3_

- [x] 11.4 Test trên Edge 120+
  - Repeat tất cả test cases trên Edge
  - Verify Chromium-based features hoạt động correctly
  - Test DevTools và network inspection
  - Verify no Edge-specific compatibility issues
  - _Yêu cầu: 10.4_

- [x] 11.5 Test responsive layout trên mobile devices
  - Test trên Chrome mobile (Android) hoặc Safari mobile (iOS)
  - Verify single-column grid layout on small screens
  - Test touch interactions và scrolling
  - Verify images scale correctly
  - Check performance on mobile networks (throttle to 3G)
  - _Yêu cầu: 3.8_


### 12. Documentation và Configuration

- [x] 12.1 Tạo README cho backend project
  - Document project structure và architecture
  - List required dependencies: .NET 9 SDK, Supabase account
  - Provide setup instructions: restore packages, configure connection string, run migrations
  - Document available API endpoints với request/response examples
  - Explain environment variable configuration
  - Include troubleshooting section
  - _Yêu cầu: All_

- [x] 12.2 Tạo README cho frontend project
  - Document project structure và component hierarchy
  - List required dependencies: Node.js 18+, npm
  - Provide setup instructions: install packages, configure env variables, run dev server
  - Document available routes: /showcase
  - Explain API client configuration
  - Include build và deployment instructions
  - _Yêu cầu: All_

- [x] 12.3 Tạo API documentation với OpenAPI/Swagger
  - Install Swashbuckle.AspNetCore package
  - Configure Swagger middleware trong Program.cs
  - Add XML documentation comments cho controllers và DTOs
  - Generate OpenAPI spec file
  - Test Swagger UI tại http://localhost:5000/swagger
  - Document error responses và status codes
  - _Yêu cầu: 2.1, 2.3, 2.4_

- [x] 12.4 Tạo .env.example files
  - Backend: Tạo .env.example với placeholder cho SUPABASE_CONNECTION
  - Frontend: Tạo .env.example với placeholder cho NEXT_PUBLIC_API_BASE_URL
  - Document ý nghĩa của từng environment variable
  - Add security warnings về không commit .env files
  - _Yêu cầu: 6.2, 6.3, 6.5, 12.3_

- [x] 12.5 Document database schema và migrations
  - Tạo file `database/schema.sql` với DDL statements
  - Tạo file `database/seed.sql` với sample data
  - Document migration process: manual SQL execution trên Supabase
  - Explain index strategy và rationale
  - Document trigger logic cho automatic timestamps
  - _Yêu cầu: 1.1, 1.2, 1.3, 1.6, 1.7_


- [x] 12.6 Document deployment process
  - Backend: Explain how to run locally (dotnet run) và configure for production
  - Frontend: Document Cloudflare Pages deployment steps
  - Alternative: Document Vercel deployment steps
  - Explain environment variable configuration trong deployment platforms
  - Document CORS configuration changes for production domains
  - Include rollback procedures
  - _Yêu cầu: 6.1, 6.4_

- [x] 12.7 Tạo CI/CD pipeline configuration
  - Tạo file `.github/workflows/backend-tests.yml`
  - Configure job để run unit tests, property tests, integration tests
  - Tạo file `.github/workflows/frontend-tests.yml`
  - Configure job để run component tests, property tests
  - Add status badges to README
  - Document how to run tests locally
  - _Yêu cầu: Testing Strategy_

### 13. System Integration và End-to-End Verification

- [x] 13.1 Verify full system integration - Happy path
  - Start Supabase database với seed data
  - Start backend: `dotnet run` (port 5000)
  - Start frontend: `npm run dev` (port 3000)
  - Navigate to http://localhost:3000/showcase
  - Verify products load và display correctly
  - Verify images load hoặc fallback to placeholder
  - Verify price formatting với VND currency
  - Verify responsive grid layout
  - Check browser console cho errors (should be none)
  - Check backend logs cho performance metrics
  - _Yêu cầu: All_

- [x] 13.2 Verify error handling - Network errors
  - Stop backend server
  - Refresh /showcase page
  - Verify ErrorMessage component displays "Cannot connect to server"
  - Click retry button
  - Verify error persists (backend still down)
  - Restart backend
  - Click retry button again
  - Verify products load successfully
  - _Yêu cầu: 3.4, 8.4, 11.7_


- [x] 13.3 Verify error handling - Database errors
  - Stop Supabase database hoặc break connection string
  - Send GET request to /api/products
  - Verify backend returns 500 error với proper ErrorResponse format
  - Verify error is logged với redacted credentials
  - Verify frontend displays "Server error" message
  - Restore database connection
  - Verify system recovers automatically
  - _Yêu cầu: 2.4, 5.7, 8.1, 8.2_

- [x] 13.4 Verify CORS configuration
  - Open browser DevTools Network tab
  - Navigate to http://localhost:3000/showcase
  - Inspect OPTIONS preflight request
  - Verify response headers: Access-Control-Allow-Origin: http://localhost:3000
  - Verify Access-Control-Allow-Methods includes GET
  - Verify Access-Control-Allow-Credentials: true
  - Test from disallowed origin (should fail)
  - _Yêu cầu: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 13.5 Verify security headers
  - Send GET request to any API endpoint
  - Inspect response headers
  - Verify X-Content-Type-Options: nosniff
  - Verify X-Frame-Options: DENY
  - Verify X-XSS-Protection: 1; mode=block
  - Test trên multiple endpoints
  - _Yêu cầu: 12.5_

- [x] 13.6 Verify rate limiting
  - Write script để send 150 requests per minute to /api/products
  - Verify first 100 requests return 200 OK
  - Verify requests 101+ return 429 Too Many Requests
  - Verify Retry-After header is present trong 429 responses
  - Wait 1 minute
  - Verify rate limit resets và requests succeed again
  - _Yêu cầu: 12.6, 12.7_

- [x] 13.7 Verify performance targets
  - Run K6 load test với 5 CCU
  - Verify p95 response time < 50ms
  - Verify no failed requests
  - Verify no timeouts
  - Check database query time < 20ms
  - Check connection pool efficiency
  - Document actual performance metrics
  - _Yêu cầu: 2.7, 5.5, 11.5_


- [x] 13.8 Verify all 18 correctness properties pass
  - Run full property test suite: `dotnet test --filter Category=Property`
  - Verify tất cả 14 backend property tests pass (Properties 1-6, 9-16)
  - Run frontend property tests: `npm run test:property`
  - Verify tất cả 4 frontend property tests pass (Properties 7-8, 17-18)
  - Document any failing cases và root causes
  - Fix issues và re-run tests
  - Confirm 100% property test pass rate
  - _Yêu cầu: All Correctness Properties_

- [x] 13.9 Final checkpoint - System ready for demo
  - Đảm bảo tất cả tests pass (unit, integration, property)
  - Verify documentation đầy đủ và accurate
  - Run full system integration test suite
  - Verify performance targets achieved
  - Verify browser compatibility trên 4 browsers
  - Check code quality: no compiler warnings, no linter errors
  - Review logs: no errors trong normal operation
  - Prepare demo script và talking points
  - Hỏi user nếu có concerns hoặc additional requirements

## Notes

### Task Dependencies và Execution Order

**Wave 0 (Foundation - Run first):**
- Database setup (1.1, 1.2, 1.3)
- Backend project initialization (2.1)
- Frontend project initialization (3.1)

**Wave 1 (Core Implementation):**
- Database seed data (1.4)
- Backend models và repositories (2.3, 2.4)
- Frontend types và API client (3.2, 3.3)

**Wave 2 (API và UI Components):**
- Backend service và controller (2.5, 2.6)
- Frontend components (3.4, 3.5, 3.6)
- Backend checkpoint (2.7)

**Wave 3 (Middleware và Security):**
- CORS configuration (4.1, 4.2)
- Exception handling middleware (4.3)
- Security headers (4.4)
- Rate limiting (4.5)
- Credentials redaction (4.6)
- Logging configuration (4.7)

**Wave 4 (Frontend Integration):**
- Showcase route (3.7)
- Responsive CSS (3.8)
- Placeholder image (3.9)
- Frontend checkpoint (3.10)

**Wave 5 (Validation và Security):**
- Input validation (5.1, 5.2)
- SQL injection prevention (5.3)
- Environment variables (5.4)
- Browser compatibility detection (5.5)

**Wave 6 (Test Infrastructure):**
- Backend testing setup (6.1)
- Frontend testing setup (6.2)
- Custom generators (6.3, 6.4)

**Wave 7 (Property-Based Tests - Can run in parallel):**
- Backend property tests (7.1-7.14)
- Frontend property tests (8.1-8.4)

**Wave 8 (Unit và Integration Tests - Can run in parallel):**
- Backend unit tests (9.1, 9.2, 9.3)
- Frontend unit tests (9.4, 9.5, 9.6, 9.7)
- Integration tests (9.8, 9.9, 9.10)

**Wave 9 (Performance và Compatibility - Can run in parallel):**
- Performance testing (10.1-10.5)
- Browser compatibility testing (11.1-11.5)

**Wave 10 (Documentation):**
- Documentation (12.1-12.7)

**Wave 11 (Final Verification):**
- System integration verification (13.1-13.9)


### Task Characteristics

**Incremental Implementation:**
- Mỗi task build lên trên kết quả của các tasks trước đó
- Checkpoints (2.7, 3.10, 13.9) đảm bảo system stability trước khi tiến xa hơn
- Core functionality được implement trước khi thêm optimizations và tests

**Test Coverage:**
- 14 backend property-based tests validate universal correctness properties
- 4 frontend property-based tests ensure UI reliability
- Unit tests và integration tests complement property tests
- Tất cả test tasks được đánh dấu optional (`*`) để cho phép faster MVP

**Requirements Traceability:**
- Mỗi task reference cụ thể requirements từ requirements.md
- Property tests reference design properties từ design.md
- Full coverage cho 12 requirements và 18 correctness properties

**Coding-Only Focus:**
- Tất cả tasks có thể được thực hiện bởi coding agent
- Không có manual user testing hoặc deployment to production
- Automated tests replace manual verification where possible

### Optional Tasks (Marked với `*`)

Tasks được đánh dấu với `*` là optional và có thể bỏ qua để faster MVP delivery:
- Tất cả property-based test tasks (7.1-7.14, 8.1-8.4)
- Tất cả unit test tasks (9.1-9.10)
- Tất cả performance test tasks (10.1-10.5)
- Tất cả browser compatibility test tasks (11.1-11.5)

**Core implementation tasks (KHÔNG có `*`) MUST be completed:**
- Database setup (1.1-1.4)
- Backend core (2.1-2.7)
- Frontend core (3.1-3.10)
- CORS và middleware (4.1-4.7)
- Validation và security (5.1-5.5)
- Test infrastructure setup (6.1-6.4) - chuẩn bị cho optional tests
- Documentation (12.1-12.7)
- Final verification (13.1-13.9)


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "2.1", "3.1"]
    },
    {
      "id": 1,
      "tasks": ["1.2", "2.2", "3.2"]
    },
    {
      "id": 2,
      "tasks": ["1.3", "2.3", "3.3", "6.1", "6.2"]
    },
    {
      "id": 3,
      "tasks": ["1.4", "2.4", "3.4", "6.3", "6.4"]
    },
    {
      "id": 4,
      "tasks": ["2.5", "3.5", "3.6"]
    },
    {
      "id": 5,
      "tasks": ["2.6", "3.7", "4.1"]
    },
    {
      "id": 6,
      "tasks": ["2.7", "3.8", "4.2", "4.3", "4.4", "4.6"]
    },
    {
      "id": 7,
      "tasks": ["3.9", "4.5", "4.7", "5.1"]
    },
    {
      "id": 8,
      "tasks": ["3.10", "5.2", "5.3", "5.4", "5.5"]
    },
    {
      "id": 9,
      "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9", "7.10", "7.11", "7.12", "7.13", "7.14", "8.1", "8.2", "8.3", "8.4"]
    },
    {
      "id": 10,
      "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7"]
    },
    {
      "id": 11,
      "tasks": ["9.8", "9.9", "9.10"]
    },
    {
      "id": 12,
      "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "11.1", "11.2", "11.3", "11.4", "11.5"]
    },
    {
      "id": 13,
      "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7"]
    },
    {
      "id": 14,
      "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5", "13.6", "13.7", "13.8"]
    },
    {
      "id": 15,
      "tasks": ["13.9"]
    }
  ]
}
```

