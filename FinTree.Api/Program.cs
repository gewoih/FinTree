using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FinTree.Api;
using FinTree.Application.Abstractions;
using FinTree.Application.Accounts;
using FinTree.Application.Analytics;
using FinTree.Application.Currencies;
using FinTree.Application.Exceptions;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Identity;
using FinTree.Infrastructure;
using FinTree.Infrastructure.Database;
using FinTree.Infrastructure.Telegram;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Telegram.Bot;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
});

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("Logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Services.AddSerilog();

var allowedCorsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin =>
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var parsedOrigin))
            throw new InvalidOperationException($"Cors:AllowedOrigins contains invalid URI: {origin}");

        if (!string.Equals(parsedOrigin.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(parsedOrigin.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Cors:AllowedOrigins supports only HTTP/HTTPS schemes: {origin}");

        if (!builder.Environment.IsDevelopment() &&
            !string.Equals(parsedOrigin.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Cors:AllowedOrigins must use HTTPS outside development: {origin}");

        return $"{parsedOrigin.Scheme}://{parsedOrigin.Authority}";
    })
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray() ?? [];

if (allowedCorsOrigins.Length == 0)
    throw new InvalidOperationException("Cors:AllowedOrigins must contain at least one explicit origin.");

builder.Services.AddCors(options =>
{
    options.AddPolicy("VueFrontend", policy =>
    {
        policy.WithOrigins(allowedCorsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
    options.ForwardLimit = 1;
});

const int authRequestsPerMinute = 20;
const int apiRequestsPerMinute = 180;
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter =
                Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);

        await context.HttpContext.Response.WriteAsync(
            JsonSerializer.Serialize(new
            {
                error = "Слишком много запросов. Попробуйте позже.",
                code = "rate_limit_exceeded"
            }),
            cancellationToken);
    };

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var path = httpContext.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
            return RateLimitPartition.GetNoLimiter("non-api");
        if (HttpMethods.IsOptions(httpContext.Request.Method))
            return RateLimitPartition.GetNoLimiter("api-options");

        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var isAuthPath = path.StartsWith("/api/auth", StringComparison.OrdinalIgnoreCase);
        var bucket = isAuthPath ? "auth" : "api";
        var permitLimit = isAuthPath ? authRequestsPerMinute : apiRequestsPerMinute;

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{bucket}:{ip}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true
            });
    });
});

var authOptions = builder.Configuration.GetSection("Auth").Get<AuthOptions>() ?? new AuthOptions();
if (string.IsNullOrWhiteSpace(authOptions.JwtSecretKey))
    throw new InvalidOperationException("Auth:JwtSecretKey is missing.");
if (string.IsNullOrWhiteSpace(authOptions.Issuer))
    throw new InvalidOperationException("Auth:Issuer is missing.");
if (string.IsNullOrWhiteSpace(authOptions.Audience))
    throw new InvalidOperationException("Auth:Audience is missing.");
if (authOptions.AccessTokenLifetimeMinutes <= 0)
    throw new InvalidOperationException("Auth:AccessTokenLifetimeMinutes must be greater than zero.");
if (authOptions.RefreshTokenLifetimeDays <= 0)
    throw new InvalidOperationException("Auth:RefreshTokenLifetimeDays must be greater than zero.");

builder.Services.Configure<AuthOptions>(options =>
{
    options.JwtSecretKey = authOptions.JwtSecretKey;
    options.Issuer = authOptions.Issuer;
    options.Audience = authOptions.Audience;
    options.AccessTokenLifetimeMinutes = authOptions.AccessTokenLifetimeMinutes;
    options.RefreshTokenLifetimeDays = authOptions.RefreshTokenLifetimeDays;
});
builder.Services.Configure<TelegramAuthOptions>(builder.Configuration.GetSection("Telegram"));

builder.Services.AddIdentity<User, Role>(o =>
    {
        o.User.RequireUniqueEmail = true;
        o.Password.RequireNonAlphanumeric = true;
        o.Password.RequireDigit = true;
        o.Password.RequireLowercase = true;
        o.Password.RequireUppercase = true;
        o.Password.RequiredLength = 8;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authOptions.JwtSecretKey)),
            ValidIssuer = authOptions.Issuer,
            ValidAudience = authOptions.Audience,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var token = context.Request.Cookies[AuthConstants.AccessTokenCookieName];
                if (!string.IsNullOrWhiteSpace(token))
                    context.Token = token;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString);
    if (builder.Environment.IsDevelopment())
        options.EnableSensitiveDataLogging();
});
builder.Services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

var telegramToken = builder.Configuration["Telegram:BotToken"];
if (!string.IsNullOrWhiteSpace(telegramToken))
    builder.Services.AddSingleton<TelegramBotClient>(_ => new TelegramBotClient(telegramToken));

builder.Services.AddScoped<TransactionCategoryService>();
builder.Services.AddScoped<TransactionsService>();
builder.Services.AddScoped<AccountsService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddScoped<AnalyticsService>();
builder.Services.AddScoped<CurrencyConverter>();
builder.Services.AddScoped<DatabaseInitializer>();

if (!string.IsNullOrWhiteSpace(telegramToken))
    builder.Services.AddHostedService<TelegramBotHostedService>();
builder.Services.AddHostedService<FxLoader>();

var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseForwardedHeaders();
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseExceptionHandler(b =>
{
    b.Run(async context =>
    {
        var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        context.Response.ContentType = "application/json";

        var (statusCode, errorCode, details) = error switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, "validation_error", null),
            DomainValidationException ex => (StatusCodes.Status400BadRequest, ex.Code, ex.Details),
            ArgumentOutOfRangeException => (StatusCodes.Status400BadRequest, "invalid_argument", null),
            ArgumentException => (StatusCodes.Status400BadRequest, "invalid_argument", null),
            InvalidOperationException => (StatusCodes.Status400BadRequest, "invalid_operation", null),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "unauthorized", null),
            ForbiddenException ex => (StatusCodes.Status403Forbidden, ex.Code, ex.Details),
            NotFoundException => (StatusCodes.Status404NotFound, "not_found", null),
            ConflictException ex => (StatusCodes.Status409Conflict, ex.Code, ex.Details),
            _ => (StatusCodes.Status500InternalServerError, "internal_error", null)
        };

        context.Response.StatusCode = statusCode;

        var message = statusCode >= StatusCodes.Status500InternalServerError && !app.Environment.IsDevelopment()
            ? "Произошла ошибка. Попробуйте позже."
            : error?.Message;
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            error = message,
            code = errorCode,
            details
        }));
    });
});

app.UseCors("VueFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseMiddleware<SubscriptionWriteAccessMiddleware>();
app.UseAuthorization();

app.MapControllers();

using var scope = app.Services.CreateScope();
var serviceProvider = scope.ServiceProvider;

var appDbContext = serviceProvider.GetRequiredService<AppDbContext>();
await appDbContext.Database.MigrateAsync();

var dbInitializer = serviceProvider.GetRequiredService<DatabaseInitializer>();
await dbInitializer.SeedTransactionCategories();

await app.RunAsync();
