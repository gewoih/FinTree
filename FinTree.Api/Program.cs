using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FinTree.Api;
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
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Telegram.Bot;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("Logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Services.AddSerilog();

builder.Services.AddCors(options =>
{
    options.AddPolicy("VueFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var authOptions = builder.Configuration.GetSection("Auth").Get<AuthOptions>() ?? new AuthOptions();
if (string.IsNullOrWhiteSpace(authOptions.JwtSecretKey))
    throw new InvalidOperationException("Auth:JwtSecretKey is missing.");
if (string.IsNullOrWhiteSpace(authOptions.Issuer))
    throw new InvalidOperationException("Auth:Issuer is missing.");
if (string.IsNullOrWhiteSpace(authOptions.Audience))
    throw new InvalidOperationException("Auth:Audience is missing.");
if (authOptions.TokenLifetimeDays <= 0)
    throw new InvalidOperationException("Auth:TokenLifetimeDays must be greater than zero.");

builder.Services.Configure<AuthOptions>(options =>
{
    options.JwtSecretKey = authOptions.JwtSecretKey;
    options.Issuer = authOptions.Issuer;
    options.Audience = authOptions.Audience;
    options.TokenLifetimeDays = authOptions.TokenLifetimeDays;
});

builder.Services.AddIdentity<User, Role>(o =>
    {
        o.User.RequireUniqueEmail = true;
        o.SignIn.RequireConfirmedEmail = false;
        o.Password.RequireNonAlphanumeric = true;
        o.Password.RequireDigit = true;
        o.Password.RequireLowercase = true;
        o.Password.RequireUppercase = true;
        o.Password.RequiredUniqueChars = 4;
        o.Password.RequiredLength = 8;
        o.Lockout.AllowedForNewUsers = true;
        o.Lockout.MaxFailedAccessAttempts = 5;
        o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
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
                var token = context.Request.Cookies[AuthConstants.AuthCookieName];
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

app.UseAuthentication();
app.UseAuthorization();

app.UseExceptionHandler(b =>
{
    b.Run(async context =>
    {
        var error = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        context.Response.ContentType = "application/json";

        context.Response.StatusCode = error switch
        {
            NotFoundException => StatusCodes.Status404NotFound,
            ValidationException => StatusCodes.Status400BadRequest,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            _ => StatusCodes.Status500InternalServerError
        };

        var message = app.Environment.IsDevelopment()
            ? error?.Message
            : "Произошла ошибка. Попробуйте позже.";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = message }));
    });
});

app.UseCors("VueFrontend");

app.MapControllers();

using var scope = app.Services.CreateScope();
var serviceProvider = scope.ServiceProvider;

var appDbContext = serviceProvider.GetRequiredService<AppDbContext>();
await appDbContext.Database.MigrateAsync();

var dbInitializer = serviceProvider.GetRequiredService<DatabaseInitializer>();
await dbInitializer.SeedTransactionCategories();

await app.RunAsync();
