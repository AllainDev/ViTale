using Microsoft.EntityFrameworkCore;
using Serilog;
using Infrastructure.Persistence;
using Infrastructure.Services;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Infrastructure.Repositories;
using WebApi.Middleware;
using Swashbuckle.AspNetCore.SwaggerGen;
using FluentValidation;
using FluentValidation.AspNetCore;
using System.Reflection;
using Microsoft.AspNetCore.Authentication;

// ─── Bootstrap Serilog early so startup errors are captured ────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateBootstrapLogger();

Log.Information("ViTale API starting...");

try
{
    DotNetEnv.Env.Load();
    var builder = WebApplication.CreateBuilder(args);

    // ── Validate required environment variables ─────────────────────────────
    RequireEnvVar("DB_CONNECTION_STRING");
    RequireEnvVar("JWT_SECRET");

    // ── Serilog full configuration ──────────────────────────────────────────
    builder.Host.UseSerilog((ctx, cfg) =>
    {
        cfg
            .ReadFrom.Configuration(ctx.Configuration)
            .Enrich.FromLogContext()
            .Enrich.WithMachineName()
            .Enrich.WithEnvironmentName()
            .WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                path: "/var/log/vitale/api-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                fileSizeLimitBytes: 100 * 1024 * 1024,  // 100MB
                outputTemplate:
                    "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}");

        // Suppress verbose framework logs in production
        if (!ctx.HostingEnvironment.IsDevelopment())
            cfg.MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
               .MinimumLevel.Override("System", Serilog.Events.LogEventLevel.Warning);
    });

    // ── Database ────────────────────────────────────────────────────────────
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
    {
        options.UseNpgsql(
            builder.Configuration["DB_CONNECTION_STRING"]
                ?? Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
                ?? throw new InvalidOperationException("DB_CONNECTION_STRING not configured"),
            npg =>
            {
                npg.EnableRetryOnFailure(3);
                npg.CommandTimeout(30);
            });

        if (builder.Environment.IsDevelopment())
            options.EnableSensitiveDataLogging().LogTo(Console.WriteLine);
    });

    // ── Repositories (Scoped) ───────────────────────────────────────────────
    builder.Services.AddScoped<ITravelerRepository, TravelerRepository>();
    builder.Services.AddScoped<IPassportAccountRepository, PassportAccountRepository>();
    builder.Services.AddScoped<IProductRepository, ProductRepository>();
    builder.Services.AddScoped<ICharacterRepository, CharacterRepository>();
    builder.Services.AddScoped<ICheckpointRepository, CheckpointRepository>();
    builder.Services.AddScoped<ICheckinRecordRepository, CheckinRecordRepository>();
    builder.Services.AddScoped<IStampRepository, StampRepository>();
    builder.Services.AddScoped<IBadgeRepository, BadgeRepository>();
    builder.Services.AddScoped<ITravelerBadgeRepository, TravelerBadgeRepository>();
    builder.Services.AddScoped<IStoryChapterRepository, StoryChapterRepository>();
    builder.Services.AddScoped<IPartnerRepository, PartnerRepository>();
    builder.Services.AddScoped<IVoucherRepository, VoucherRepository>();
    builder.Services.AddScoped<ITravelerVoucherRepository, TravelerVoucherRepository>();
    builder.Services.AddScoped<IChatSessionRepository, ChatSessionRepository>();
    builder.Services.AddScoped<IChatMessageRepository, ChatMessageRepository>();
    builder.Services.AddScoped<ITranslationRepository, TranslationRepository>();

    // ── External Services (Scoped) ──────────────────────────────────────────
    builder.Services.AddScoped<IAiChatService, GroqChatService>();
    builder.Services.AddScoped<ITextToSpeechService, AzureTtsService>();
    builder.Services.AddScoped<Application.Interfaces.Services.IAuthenticationService, JwtAuthService>();
    builder.Services.AddScoped<IEmailService, SmtpEmailService>();
    builder.Services.AddScoped<IEmailValidationService, EmailValidationService>();
    builder.Services.AddScoped<ITokenService, TokenService>();

    // ── Gamification Services (Scoped) ──────────────────────────────────────
    builder.Services.AddScoped<IGamificationService, GamificationService>();
    builder.Services.AddScoped<ICheckinService, CheckinService>();

    // ── Internal Services (Singleton — stateless) ───────────────────────────
    builder.Services.AddSingleton<IGeolocationService, GeolocationService>();
    builder.Services.AddSingleton<ISecureRandomService, SecureRandomService>();
    builder.Services.AddSingleton<IStorageService, R2StorageService>();

    // ── HTTP Clients ────────────────────────────────────────────────────────
    builder.Services.AddHttpClient("Groq", c =>
    {
        c.BaseAddress = new Uri("https://api.groq.com/");
        c.Timeout = TimeSpan.FromSeconds(20);
    });

    builder.Services.AddHttpClient("AzureTts", c =>
    {
        c.Timeout = TimeSpan.FromSeconds(30);
    });

    // ── Memory Cache (for rate limiting counters) ───────────────────────────
    builder.Services.AddMemoryCache();

    // ── FluentValidation ────────────────────────────────────────────────────
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

    // ── MVC Controllers ─────────────────────────────────────────────────────
    builder.Services.AddControllers()
        .AddJsonOptions(opts =>
        {
            opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            opts.JsonSerializerOptions.WriteIndented = builder.Environment.IsDevelopment();
        });

    // ── Swagger / OpenAPI ───────────────────────────────────────────────────
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "ViTale API", Version = "v1" });
    });

    // ── CORS ────────────────────────────────────────────────────────────────
    var corsOrigins = (Environment.GetEnvironmentVariable("CORS_ORIGINS")
                       ?? builder.Configuration["CORS_ORIGINS"]
                       ?? "http://localhost:3000")
                      .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    builder.Services.AddCors(opts =>
    {
        opts.AddPolicy("ViTalePolicy", policy =>
        {
            policy.WithOrigins(corsOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();  // required for HTTP-Only cookie
        });
    });

    // ── Authentication & Authorization ─────────────────────────────────────────
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
        options.DefaultSignInScheme = Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(builder.Configuration["JWT_SECRET"] ?? Environment.GetEnvironmentVariable("JWT_SECRET") ?? throw new InvalidOperationException("JWT_SECRET missing"))),
            ValidateIssuer = true,
            ValidIssuer = "vitale.vn",
            ValidateAudience = true,
            ValidAudience = "app.vitale.vn",
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    })
    .AddCookie()
    .AddGoogle(options =>
    {
        options.ClientId = builder.Configuration["OAUTH_GOOGLE_CLIENT_ID"] ?? Environment.GetEnvironmentVariable("OAUTH_GOOGLE_CLIENT_ID") ?? "dummy";
        options.ClientSecret = builder.Configuration["OAUTH_GOOGLE_CLIENT_SECRET"] ?? Environment.GetEnvironmentVariable("OAUTH_GOOGLE_CLIENT_SECRET") ?? "dummy";
        options.AccessDeniedPath = "/api/v1/auth/access-denied";
        options.ClaimActions.MapJsonKey(System.Security.Claims.ClaimTypes.Name, "name");
        options.Events.OnRemoteFailure = ctx =>
        {
            ctx.Response.Redirect("http://localhost:3000/auth/callback?error=remote_failure");
            ctx.HandleResponse();
            return Task.CompletedTask;
        };
    })
    .AddFacebook(options =>
    {
        options.AppId = builder.Configuration["OAUTH_FACEBOOK_APP_ID"] ?? Environment.GetEnvironmentVariable("OAUTH_FACEBOOK_APP_ID") ?? "dummy";
        options.AppSecret = builder.Configuration["OAUTH_FACEBOOK_APP_SECRET"] ?? Environment.GetEnvironmentVariable("OAUTH_FACEBOOK_APP_SECRET") ?? "dummy";
        options.AccessDeniedPath = "/api/v1/auth/access-denied";
        options.Fields.Add("name");
        options.ClaimActions.MapJsonKey(System.Security.Claims.ClaimTypes.Name, "name");
        options.Events.OnRemoteFailure = ctx =>
        {
            ctx.Response.Redirect("http://localhost:3000/auth/callback?error=remote_failure");
            ctx.HandleResponse();
            return Task.CompletedTask;
        };
    });

    // ──────────────────────────────────────────────────────────────────────
    var app = builder.Build();

    // ── Auto-migrate and seed on startup ────────────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Log.Information("Running EF Core migrations...");
        await db.Database.MigrateAsync();
        Log.Information("Migrations complete. Running seed data...");
        await DatabaseSeeder.SeedAsync(db);
        Log.Information("Seed complete.");
    }

    // ── Middleware Pipeline (order matters!) ─────────────────────────────────
    // 1. Exception handling FIRST — catches everything below
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    // 2. Serilog request logging
    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000}ms";
    });

    // 3. CORS before auth
    app.UseCors("ViTalePolicy");

    // 4. Security headers
    app.Use(async (ctx, next) =>
    {
        ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
        ctx.Response.Headers["X-Frame-Options"] = "DENY";
        ctx.Response.Headers["X-XSS-Protection"] = "1; mode=block";
        ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        await next();
    });

    // 5. Anonymous identity middleware — creates vitale_session cookie if missing
    app.UseMiddleware<AnonymousIdentityMiddleware>();

    // 6. Rate limiting middleware
    app.UseMiddleware<RateLimitingMiddleware>();

    // 7. Swagger in dev
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "ViTale API v1"));
    }

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();

    Log.Information("ViTale API started on {Urls}", app.Urls);
    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "ViTale API terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

// ── Helpers ────────────────────────────────────────────────────────────────
static void RequireEnvVar(string name)
{
    var value = Environment.GetEnvironmentVariable(name);
    if (string.IsNullOrWhiteSpace(value))
    {
        Log.Fatal("Missing required environment variable: {VarName}", name);
        throw new InvalidOperationException($"Missing required environment variable: {name}");
    }
}

// Required for WebApplicationFactory in integration tests
public partial class Program { }

