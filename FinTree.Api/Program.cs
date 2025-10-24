using FinTree.Application.Transactions;
using FinTree.Infrastructure;
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

builder.Services.AddScoped<TransactionsService>();

var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

await app.RunAsync();