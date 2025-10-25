using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using FinTree.Application.Accounts;
using FinTree.Application.Exceptions;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Infrastructure.Database;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContextPool<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString);
    options.EnableSensitiveDataLogging();
});

builder.Services.AddScoped<TransactionCategoryService>();
builder.Services.AddScoped<TransactionsService>();
builder.Services.AddScoped<AccountsService>();
builder.Services.AddScoped<UserService>();

var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

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

var scope = app.Services.CreateScope();
var appDbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
await appDbContext.Database.MigrateAsync();

await Initializer.SeedCurrencies(appDbContext);
await Initializer.SeedTransactionCategories(appDbContext);
await Initializer.SeedTestUser(appDbContext);

await app.RunAsync();