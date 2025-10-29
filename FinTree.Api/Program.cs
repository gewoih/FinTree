using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Json;
using FinTree.Api;
using FinTree.Application.Accounts;
using FinTree.Application.Exceptions;
using FinTree.Application.Identity;
using FinTree.Application.Transactions;
using FinTree.Domain.Identity;
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

builder.Services.AddControllers();
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
        policy.WithOrigins("http://localhost:8080")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddIdentity<User, Role>(o =>
    {
        o.User.RequireUniqueEmail = true;
        o.SignIn.RequireConfirmedEmail = true;
        o.Password.RequireNonAlphanumeric = false;
        o.Password.RequiredUniqueChars = 4;
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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AuthService.JwtSecretKey)),
            ValidIssuer = AuthService.ValidIssuer,
            ValidAudience = AuthService.ValidAudience,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddHttpContextAccessor();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString);
    options.EnableSensitiveDataLogging();
});

builder.Services.AddSingleton<TelegramBotClient>(_ => new TelegramBotClient("8320550185:AAHAOWsd3jUUz_Ko0YkBAZgHKp8GFkDXbrU"));

builder.Services.AddScoped<TransactionCategoryService>();
builder.Services.AddScoped<TransactionsService>();
builder.Services.AddScoped<AccountsService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
    
builder.Services.AddHostedService<TelegramBotHostedService>();

var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
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
            _ => StatusCodes.Status500InternalServerError
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = error?.Message }));
    });
});

app.UseCors("VueFrontend");

app.MapControllers();

var scope = app.Services.CreateScope();
var appDbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
await appDbContext.Database.MigrateAsync();

await Initializer.SeedTransactionCategories(appDbContext);
await Initializer.SeedTestUser(appDbContext);

await app.RunAsync();