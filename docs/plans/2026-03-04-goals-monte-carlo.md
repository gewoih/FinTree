# Goals & Monte Carlo Simulation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/goals` page where users create savings targets, auto-populate parameters from live analytics, and run Monte Carlo simulations producing fan charts and probability estimates.

**Architecture:** New `Goals` domain (backend) with CRUD + `GoalSimulationService` running 10k bootstrap paths reusing `ForecastService` pool logic. Frontend: `/goals` page with list/detail layout, fan chart (Chart.js multi-band fill), editable parameters panel with auto/override badges, insights.

**Tech Stack:** .NET 10 / EF Core / PostgreSQL (backend), Vue 3 + TypeScript + PrimeVue + Chart.js (frontend)

---

## ⚠️ Key Constraints

- **Never run** `dotnet build`, `dotnet test`, `dotnet run`, or `dotnet ef migrations`
- After Task 1 you must manually run the migration:
  ```bash
  dotnet ef migrations add AddGoals --project FinTree.Infrastructure --startup-project FinTree.Api
  dotnet ef database update --project FinTree.Infrastructure --startup-project FinTree.Api
  ```
- No git commits unless explicitly asked

---

## Task 1 — Domain Entity + DbContext

**Files:**
- Create: `FinTree.Domain/Goals/Goal.cs`
- Modify: `FinTree.Application/Abstractions/IAppDbContext.cs`
- Modify: `FinTree.Infrastructure/Database/AppDbContext.cs`

**Step 1: Create the Goal entity**

```csharp
// FinTree.Domain/Goals/Goal.cs
using System.ComponentModel.DataAnnotations;
using FinTree.Domain.Base;

namespace FinTree.Domain.Goals;

public sealed class Goal : Entity
{
    [MaxLength(100)] public string Name { get; private set; }
    public Guid UserId { get; private set; }
    public decimal TargetAmount { get; private set; }
    [MaxLength(3)] public string CurrencyCode { get; private set; }
    public string? ParameterOverridesJson { get; private set; }

    internal Goal(Guid userId, string name, decimal targetAmount, string currencyCode)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(targetAmount);
        ArgumentException.ThrowIfNullOrWhiteSpace(currencyCode);

        UserId = userId;
        Name = name.Trim();
        TargetAmount = targetAmount;
        CurrencyCode = currencyCode.Trim().ToUpperInvariant();
    }

    public static Goal Create(Guid userId, string name, decimal targetAmount, string currencyCode)
        => new(userId, name, targetAmount, currencyCode);

    public void UpdateDetails(string name, decimal targetAmount, string? parameterOverridesJson)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(targetAmount);
        Name = name.Trim();
        TargetAmount = targetAmount;
        ParameterOverridesJson = parameterOverridesJson;
    }
}
```

**Step 2: Add DbSet to IAppDbContext**

In `FinTree.Application/Abstractions/IAppDbContext.cs`, add after the last `DbSet<>` line:
```csharp
using FinTree.Domain.Goals;   // add to usings at top
// ...
DbSet<Goal> Goals { get; }
```

**Step 3: Add DbSet to AppDbContext + configure**

In `FinTree.Infrastructure/Database/AppDbContext.cs`:

Add using at top:
```csharp
using FinTree.Domain.Goals;
```

Add after the last `DbSet<>` property:
```csharp
public DbSet<Goal> Goals => Set<Goal>();
```

Add a `ConfigureGoals` call inside `OnModelCreating` after the existing Configure calls:
```csharp
ConfigureGoals(modelBuilder);
```

Add the private method:
```csharp
private static void ConfigureGoals(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Goal>(entity =>
    {
        entity.ToTable("Goals");
        entity.Property(x => x.Name).HasMaxLength(100);
        entity.Property(x => x.CurrencyCode).HasMaxLength(3);
        entity.Property(x => x.TargetAmount).HasPrecision(18, 2);
        entity.Property(x => x.ParameterOverridesJson).HasMaxLength(2000);
        entity.HasIndex(x => x.UserId);
        entity.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();
    });
}
```

**Step 4: Run migration (manual — you must do this)**

```bash
cd /path/to/FinTree
dotnet ef migrations add AddGoals --project FinTree.Infrastructure --startup-project FinTree.Api
dotnet ef database update --project FinTree.Infrastructure --startup-project FinTree.Api
```

---

## Task 2 — Application DTOs

**Files:**
- Create: `FinTree.Application/Goals/Dto/GoalDto.cs`
- Create: `FinTree.Application/Goals/Dto/CreateGoalDto.cs`
- Create: `FinTree.Application/Goals/Dto/UpdateGoalDto.cs`
- Create: `FinTree.Application/Goals/Dto/GoalSimulationRequestDto.cs`
- Create: `FinTree.Application/Goals/Dto/GoalSimulationResultDto.cs`

**Step 1: GoalDto**

```csharp
// FinTree.Application/Goals/Dto/GoalDto.cs
namespace FinTree.Application.Goals.Dto;

public sealed record GoalDto(
    Guid Id,
    string Name,
    decimal TargetAmount,
    string CurrencyCode,
    string? ParameterOverridesJson,
    DateTimeOffset CreatedAt);
```

**Step 2: CreateGoalDto + UpdateGoalDto**

```csharp
// FinTree.Application/Goals/Dto/CreateGoalDto.cs
namespace FinTree.Application.Goals.Dto;

public sealed record CreateGoalDto(
    string Name,
    decimal TargetAmount,
    string CurrencyCode);
```

```csharp
// FinTree.Application/Goals/Dto/UpdateGoalDto.cs
namespace FinTree.Application.Goals.Dto;

public sealed record UpdateGoalDto(
    string Name,
    decimal TargetAmount,
    string? ParameterOverridesJson);
```

**Step 3: GoalSimulationRequestDto**

```csharp
// FinTree.Application/Goals/Dto/GoalSimulationRequestDto.cs
namespace FinTree.Application.Goals.Dto;

public sealed record GoalSimulationRequestDto(
    decimal? InitialCapital,
    decimal? MonthlyIncome,
    decimal? MonthlyExpenses,
    decimal? AnnualReturnRate,
    decimal? AnnualInflationRate,
    int? HorizonMonths);
```

**Step 4: GoalSimulationResultDto**

```csharp
// FinTree.Application/Goals/Dto/GoalSimulationResultDto.cs
namespace FinTree.Application.Goals.Dto;

public sealed record GoalSimulationResultDto(
    double Probability,
    int MedianMonths,
    int P25Months,
    int P75Months,
    GoalPercentilePathsDto PercentilePaths,
    GoalSimulationParametersDto ResolvedParameters,
    IReadOnlyList<string> Insights,
    bool IsAchievable,
    IReadOnlyList<string> MonthLabels);

public sealed record GoalPercentilePathsDto(
    IReadOnlyList<decimal> P10,
    IReadOnlyList<decimal> P20,
    IReadOnlyList<decimal> P40,
    IReadOnlyList<decimal> P50,
    IReadOnlyList<decimal> P60,
    IReadOnlyList<decimal> P80,
    IReadOnlyList<decimal> P90);

public sealed record GoalSimulationParametersDto(
    decimal InitialCapital,
    decimal MonthlyIncome,
    decimal MonthlyExpenses,
    decimal AnnualReturnRate,
    decimal AnnualInflationRate,
    bool IsCapitalFromAnalytics,
    bool IsIncomeFromAnalytics,
    bool IsExpensesFromAnalytics);
```

---

## Task 3 — GoalService (CRUD)

**Files:**
- Create: `FinTree.Application/Goals/Services/GoalService.cs`

```csharp
// FinTree.Application/Goals/Services/GoalService.cs
using FinTree.Application.Abstractions;
using FinTree.Application.Exceptions;
using FinTree.Application.Goals.Dto;
using FinTree.Application.Users;
using FinTree.Domain.Goals;
using Microsoft.EntityFrameworkCore;

namespace FinTree.Application.Goals.Services;

public sealed class GoalService(IAppDbContext context, ICurrentUser currentUser)
{
    public async Task<List<GoalDto>> GetAllAsync(CancellationToken ct = default)
    {
        var userId = currentUser.Id;
        return await context.Goals
            .AsNoTracking()
            .Where(g => g.UserId == userId)
            .OrderBy(g => g.CreatedAt)
            .Select(g => new GoalDto(g.Id, g.Name, g.TargetAmount, g.CurrencyCode, g.ParameterOverridesJson, g.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<GoalDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var userId = currentUser.Id;
        var goal = await context.Goals
            .AsNoTracking()
            .Where(g => g.Id == id && g.UserId == userId)
            .Select(g => new GoalDto(g.Id, g.Name, g.TargetAmount, g.CurrencyCode, g.ParameterOverridesJson, g.CreatedAt))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(Goal), id);
        return goal;
    }

    public async Task<GoalDto> CreateAsync(CreateGoalDto dto, CancellationToken ct = default)
    {
        var userId = currentUser.Id;
        var goal = Goal.Create(userId, dto.Name, dto.TargetAmount, dto.CurrencyCode);
        context.Goals.Add(goal);
        await context.SaveChangesAsync(ct);
        return new GoalDto(goal.Id, goal.Name, goal.TargetAmount, goal.CurrencyCode, goal.ParameterOverridesJson, goal.CreatedAt);
    }

    public async Task<GoalDto> UpdateAsync(Guid id, UpdateGoalDto dto, CancellationToken ct = default)
    {
        var userId = currentUser.Id;
        var goal = await context.Goals
            .Where(g => g.Id == id && g.UserId == userId)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(Goal), id);

        goal.UpdateDetails(dto.Name, dto.TargetAmount, dto.ParameterOverridesJson);
        await context.SaveChangesAsync(ct);
        return new GoalDto(goal.Id, goal.Name, goal.TargetAmount, goal.CurrencyCode, goal.ParameterOverridesJson, goal.CreatedAt);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = currentUser.Id;
        var goal = await context.Goals
            .Where(g => g.Id == id && g.UserId == userId)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(Goal), id);

        goal.Delete();
        await context.SaveChangesAsync(ct);
    }
}
```

---

## Task 4 — GoalSimulationService (Monte Carlo Engine)

**Files:**
- Create: `FinTree.Application/Goals/Services/GoalSimulationService.cs`

This is the core of the feature. It reuses the bootstrap pool logic from `ForecastService`.

```csharp
// FinTree.Application/Goals/Services/GoalSimulationService.cs
using System.Text.Json;
using FinTree.Application.Analytics.Services;
using FinTree.Application.Analytics.Shared;
using FinTree.Application.Currencies;
using FinTree.Application.Goals.Dto;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Goals;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Goals.Services;

public sealed class GoalSimulationService(
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    ExpenseService expenseService,
    NetWorthService netWorthService,
    UserService userService)
{
    private const int SimulationCount = 10_000;
    private const int MaxHorizonMonths = 360;
    private const int DisplayMonths = 120;
    private const double Lambda = 0.02; // exponential decay, same as ForecastService

    public async Task<GoalSimulationResultDto> SimulateAsync(
        Goal goal,
        GoalSimulationRequestDto request,
        CancellationToken ct)
    {
        var nowUtc = DateTime.UtcNow;
        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);

        // --- Resolve parameters (override or analytics default) ---
        bool capitalFromAnalytics = !request.InitialCapital.HasValue;
        decimal initialCapital = request.InitialCapital ?? await ResolveInitialCapitalAsync(ct);

        bool incomeFromAnalytics = !request.MonthlyIncome.HasValue;
        decimal monthlyIncome = request.MonthlyIncome ?? await ResolveMonthlyIncomeAsync(baseCurrencyCode, nowUtc, ct);

        bool expensesFromAnalytics = !request.MonthlyExpenses.HasValue;
        decimal avgDailyExpense;
        decimal[] pool;

        if (request.MonthlyExpenses.HasValue)
        {
            avgDailyExpense = request.MonthlyExpenses.Value / (decimal)AnalyticsCommon.AverageDaysInMonth;
            // Flat pool when user-specified
            pool = Enumerable.Repeat(avgDailyExpense, 90).ToArray();
        }
        else
        {
            avgDailyExpense = await expenseService.GetAverageDailyExpenseAsync(baseCurrencyCode, nowUtc, ct);
            pool = await BuildBootstrapPoolAsync(baseCurrencyCode, nowUtc, ct);
        }

        decimal monthlyExpenses = avgDailyExpense * (decimal)AnalyticsCommon.AverageDaysInMonth;
        decimal annualReturnRate = request.AnnualReturnRate ?? 0m;
        decimal annualInflationRate = request.AnnualInflationRate ?? 0.07m;

        var resolvedParams = new GoalSimulationParametersDto(
            initialCapital, monthlyIncome, monthlyExpenses,
            annualReturnRate, annualInflationRate,
            capitalFromAnalytics, incomeFromAnalytics, expensesFromAnalytics);

        // --- Check achievability ---
        decimal avgMonthlySavings = monthlyIncome - monthlyExpenses;
        bool isAchievable = avgMonthlySavings > 0 || initialCapital >= goal.TargetAmount;

        if (!isAchievable)
        {
            return BuildUnachievableResult(resolvedParams, goal, nowUtc);
        }

        // --- Build weighted CDF for bootstrap sampling ---
        var cdf = BuildWeightedCdf(pool);
        var rng = new Random(42);

        int horizonMonths = Math.Min(request.HorizonMonths ?? MaxHorizonMonths, MaxHorizonMonths);
        double monthlyReturn = (double)annualReturnRate / 12;
        double monthlyInflation = (double)annualInflationRate / 12;

        // Store capital paths for display (first DisplayMonths months only)
        int displayLen = Math.Min(horizonMonths, DisplayMonths);
        var allPaths = new decimal[SimulationCount][];
        var hitMonths = new int[SimulationCount];
        Array.Fill(hitMonths, -1);

        for (var s = 0; s < SimulationCount; s++)
        {
            allPaths[s] = new decimal[displayLen + 1];
            allPaths[s][0] = initialCapital;
            var capital = initialCapital;

            for (var m = 1; m <= horizonMonths; m++)
            {
                var sampledDailyExpense = SampleFromPool(pool, cdf, rng);
                var sampledExpense = sampledDailyExpense * (decimal)AnalyticsCommon.AverageDaysInMonth;
                var savings = monthlyIncome - sampledExpense;
                capital = capital * (1m + (decimal)monthlyReturn) + savings;

                if (m <= displayLen)
                    allPaths[s][m] = capital;

                var realTarget = goal.TargetAmount * (decimal)Math.Pow(1 + monthlyInflation, m);
                if (capital >= realTarget && hitMonths[s] == -1)
                    hitMonths[s] = m;
            }
        }

        // --- Compute statistics ---
        var successMonths = hitMonths.Where(m => m >= 0).OrderBy(m => m).ToArray();
        double probability = (double)successMonths.Length / SimulationCount;
        int medianMonths = successMonths.Length > 0 ? successMonths[successMonths.Length / 2] : -1;
        int p25Months = successMonths.Length > 0 ? successMonths[(int)(successMonths.Length * 0.25)] : -1;
        int p75Months = successMonths.Length > 0 ? successMonths[(int)(successMonths.Length * 0.75)] : -1;

        // --- Compute percentile paths for chart ---
        var percentilePaths = ComputePercentilePaths(allPaths, displayLen);

        // --- Build month labels ---
        var monthLabels = BuildMonthLabels(nowUtc, displayLen);

        // --- Generate insights ---
        var insights = GenerateInsights(
            probability, successMonths, monthlyIncome, monthlyExpenses,
            annualReturnRate, annualInflationRate, goal.TargetAmount, initialCapital, nowUtc);

        return new GoalSimulationResultDto(
            probability, medianMonths, p25Months, p75Months,
            percentilePaths, resolvedParams, insights, true, monthLabels);
    }

    // --- Private helpers ---

    private async Task<decimal> ResolveInitialCapitalAsync(CancellationToken ct)
    {
        var snapshots = await netWorthService.GetNetWorthTrendAsync(1, ct);
        return snapshots.LastOrDefault()?.NetWorth ?? 0m;
    }

    private async Task<decimal> ResolveMonthlyIncomeAsync(string baseCurrencyCode, DateTime nowUtc, CancellationToken ct)
    {
        var fromUtc = nowUtc.AddDays(-AnalyticsCommon.AverageExpenseRollingWindowDays);
        var incomeTransactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc, nowUtc, excludeTransfers: true, type: TransactionType.Income, ct: ct);

        if (incomeTransactions.Count == 0) return 0m;

        var rates = await currencyConverter.GetCrossRatesAsync(
            incomeTransactions.Select(t => (t.Money.CurrencyCode, t.OccurredAtUtc)),
            baseCurrencyCode, ct);

        var totalIncome = incomeTransactions.Sum(t =>
            t.Money.Amount * rates[(t.Money.CurrencyCode, t.OccurredAtUtc.Date)]);

        var windowDays = (decimal)(nowUtc - fromUtc).TotalDays;
        if (windowDays <= 0) return 0m;

        var avgDailyIncome = totalIncome / windowDays;
        return avgDailyIncome * (decimal)AnalyticsCommon.AverageDaysInMonth;
    }

    private async Task<decimal[]> BuildBootstrapPoolAsync(string baseCurrencyCode, DateTime nowUtc, CancellationToken ct)
    {
        var fromUtc = nowUtc.AddDays(-AnalyticsCommon.AverageExpenseRollingWindowDays);
        var transactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc, nowUtc, excludeTransfers: true, type: TransactionType.Expense, ct: ct);

        if (transactions.Count == 0) return [0m];

        var rates = await currencyConverter.GetCrossRatesAsync(
            transactions.Select(t => (t.Money.CurrencyCode, t.OccurredAtUtc)),
            baseCurrencyCode, ct);

        var dailyTotals = new Dictionary<DateOnly, decimal>();
        foreach (var t in transactions)
        {
            var rateKey = (t.Money.CurrencyCode, t.OccurredAtUtc.Date);
            var amount = t.Money.Amount * rates[rateKey];
            var key = DateOnly.FromDateTime(t.OccurredAtUtc);
            dailyTotals[key] = dailyTotals.GetValueOrDefault(key, 0m) + amount;
        }

        var poolDays = (int)(nowUtc - fromUtc).TotalDays + 1;
        var pool = new decimal[poolDays];
        for (var i = 0; i < poolDays; i++)
        {
            var key = DateOnly.FromDateTime(fromUtc.AddDays(i));
            pool[i] = dailyTotals.GetValueOrDefault(key, 0m);
        }
        return pool;
    }

    private static double[] BuildWeightedCdf(decimal[] pool)
    {
        var cdf = new double[pool.Length];
        var weightSum = 0.0;
        for (var i = 0; i < pool.Length; i++)
        {
            var age = pool.Length - 1 - i;
            weightSum += Math.Exp(-Lambda * age);
            cdf[i] = weightSum;
        }
        for (var i = 0; i < pool.Length; i++) cdf[i] /= weightSum;
        return cdf;
    }

    private static decimal SampleFromPool(decimal[] pool, double[] cdf, Random rng)
    {
        var u = rng.NextDouble();
        var idx = Array.BinarySearch(cdf, u);
        if (idx < 0) idx = ~idx;
        return pool[Math.Clamp(idx, 0, pool.Length - 1)];
    }

    private static GoalPercentilePathsDto ComputePercentilePaths(decimal[][] allPaths, int displayLen)
    {
        var p10 = new decimal[displayLen + 1];
        var p20 = new decimal[displayLen + 1];
        var p40 = new decimal[displayLen + 1];
        var p50 = new decimal[displayLen + 1];
        var p60 = new decimal[displayLen + 1];
        var p80 = new decimal[displayLen + 1];
        var p90 = new decimal[displayLen + 1];

        var n = allPaths.Length;
        var sortBuf = new decimal[n];

        for (var m = 0; m <= displayLen; m++)
        {
            for (var s = 0; s < n; s++) sortBuf[s] = allPaths[s][m];
            Array.Sort(sortBuf);

            p10[m] = sortBuf[(int)(n * 0.10)];
            p20[m] = sortBuf[(int)(n * 0.20)];
            p40[m] = sortBuf[(int)(n * 0.40)];
            p50[m] = sortBuf[n / 2];
            p60[m] = sortBuf[(int)(n * 0.60)];
            p80[m] = sortBuf[(int)(n * 0.80)];
            p90[m] = sortBuf[(int)(n * 0.90)];
        }

        return new GoalPercentilePathsDto(p10, p20, p40, p50, p60, p80, p90);
    }

    private static IReadOnlyList<string> BuildMonthLabels(DateTime nowUtc, int count)
    {
        var labels = new string[count + 1];
        for (var m = 0; m <= count; m++)
        {
            var date = nowUtc.AddMonths(m);
            labels[m] = $"{date:MMM yyyy}";
        }
        return labels;
    }

    private static IReadOnlyList<string> GenerateInsights(
        double probability, int[] successMonths, decimal monthlyIncome, decimal monthlyExpenses,
        decimal annualReturnRate, decimal annualInflationRate, decimal targetAmount,
        decimal initialCapital, DateTime nowUtc)
    {
        var insights = new List<string>();

        // 1. Progress insight
        if (initialCapital > 0 && targetAmount > 0)
        {
            var pct = Math.Round((double)initialCapital / (double)targetAmount * 100, 1);
            insights.Add($"Уже накоплено {pct}% от цели ({initialCapital:N0} из {targetAmount:N0})");
        }

        // 2. Inflation-adjusted real target
        if (annualInflationRate > 0 && successMonths.Length > 0)
        {
            var medianMonths = successMonths[successMonths.Length / 2];
            var realTarget = targetAmount * (decimal)Math.Pow(1 + (double)annualInflationRate / 12, medianMonths);
            insights.Add($"С учётом инфляции реальная цель к тому времени составит ~{realTarget:N0}");
        }

        // 3. Expense sensitivity: reduce expenses by 10%
        if (monthlyExpenses > 0)
        {
            var reducedExpenses = monthlyExpenses * 0.9m;
            var reduction = monthlyExpenses - reducedExpenses;
            insights.Add($"Снижение расходов на {reduction:N0}/мес даст заметный прирост вероятности");
        }

        // 4. Return rate sensitivity (if currently 0)
        if (annualReturnRate == 0m)
        {
            insights.Add("Инвестирование сбережений под 10%/год значительно ускорит достижение цели");
        }
        else if (annualReturnRate < 0.10m)
        {
            var higherReturn = annualReturnRate + 0.05m;
            insights.Add($"Увеличение доходности до {higherReturn:P0} ускорит накопление");
        }

        // 5. Probability note
        if (probability < 0.5)
        {
            insights.Add("Вероятность ниже 50% — рассмотрите увеличение взносов или снижение расходов");
        }
        else if (probability >= 0.9)
        {
            insights.Add("Высокая вероятность — цель хорошо согласована с вашими финансами");
        }

        return insights;
    }

    private static GoalSimulationResultDto BuildUnachievableResult(
        GoalSimulationParametersDto resolvedParams, Goal goal, DateTime nowUtc)
    {
        var emptyPaths = new GoalPercentilePathsDto([], [], [], [], [], [], []);
        var insights = new List<string>
        {
            "Текущие расходы превышают доходы — накопление невозможно при таких параметрах",
            "Попробуйте увеличить доход или снизить расходы"
        };
        return new GoalSimulationResultDto(
            0, -1, -1, -1, emptyPaths, resolvedParams, insights, false, []);
    }
}
```

---

## Task 5 — GoalsController

**Files:**
- Create: `FinTree.Api/Controllers/GoalsController.cs`

```csharp
// FinTree.Api/Controllers/GoalsController.cs
using FinTree.Application.Goals.Dto;
using FinTree.Application.Goals.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class GoalsController(GoalService goalService, GoalSimulationService simulationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var goals = await goalService.GetAllAsync(ct);
        return Ok(goals);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var goal = await goalService.GetByIdAsync(id, ct);
        return Ok(goal);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGoalDto dto, CancellationToken ct)
    {
        var goal = await goalService.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = goal.Id }, goal);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateGoalDto dto, CancellationToken ct)
    {
        var goal = await goalService.UpdateAsync(id, dto, ct);
        return Ok(goal);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await goalService.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/simulate")]
    public async Task<IActionResult> Simulate(Guid id, [FromBody] GoalSimulationRequestDto dto, CancellationToken ct)
    {
        // Load goal to get TargetAmount and CurrencyCode
        var goalDto = await goalService.GetByIdAsync(id, ct);
        // Re-load as domain object for simulation
        var goal = await simulationService.LoadGoalForSimulationAsync(id, ct);
        var result = await simulationService.SimulateAsync(goal, dto, ct);
        return Ok(result);
    }
}
```

**Note:** The `simulate` endpoint above calls `simulationService.LoadGoalForSimulationAsync` — add this helper to `GoalSimulationService`:

```csharp
// Add to GoalSimulationService — inject IAppDbContext
// Add to constructor: IAppDbContext context

public async Task<Goal> LoadGoalForSimulationAsync(Guid goalId, CancellationToken ct)
{
    var userId = currentUser.Id; // add ICurrentUser to constructor too
    return await context.Goals
        .AsNoTracking()
        .Where(g => g.Id == goalId && g.UserId == userId)
        .FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException(nameof(Goal), goalId);
}
```

Update `GoalSimulationService` constructor to include `IAppDbContext context, ICurrentUser currentUser`:
```csharp
public sealed class GoalSimulationService(
    IAppDbContext context,
    ICurrentUser currentUser,
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    ExpenseService expenseService,
    NetWorthService netWorthService,
    UserService userService)
```

---

## Task 6 — DI Registration

**Files:**
- Modify: `FinTree.Api/Program.cs`

Find the analytics services registration block and add after it:
```csharp
builder.Services.AddScoped<GoalService>();
builder.Services.AddScoped<GoalSimulationService>();
```

Add using at the top of Program.cs:
```csharp
using FinTree.Application.Goals.Services;
```

---

## Task 7 — Frontend Types + API Service

**Files:**
- Modify: `vue-app/src/types.ts` (add goal types)
- Modify: `vue-app/src/services/api.service.ts` (add goal methods)

**Step 1: Add types to `types.ts`**

Find the end of the file (before the last export if any, or at the end) and add:

```typescript
// --- Goals ---

export interface GoalDto {
  id: string
  name: string
  targetAmount: number
  currencyCode: string
  parameterOverridesJson: string | null
  createdAt: string
}

export interface GoalParameterOverrides {
  initialCapital?: number | null
  monthlyIncome?: number | null
  monthlyExpenses?: number | null
  annualReturnRate?: number | null
  annualInflationRate?: number | null
}

export interface GoalSimulationRequestDto {
  initialCapital?: number | null
  monthlyIncome?: number | null
  monthlyExpenses?: number | null
  annualReturnRate?: number | null
  annualInflationRate?: number | null
  horizonMonths?: number | null
}

export interface GoalSimulationParametersDto {
  initialCapital: number
  monthlyIncome: number
  monthlyExpenses: number
  annualReturnRate: number
  annualInflationRate: number
  isCapitalFromAnalytics: boolean
  isIncomeFromAnalytics: boolean
  isExpensesFromAnalytics: boolean
}

export interface GoalPercentilePathsDto {
  p10: number[]
  p20: number[]
  p40: number[]
  p50: number[]
  p60: number[]
  p80: number[]
  p90: number[]
}

export interface GoalSimulationResultDto {
  probability: number
  medianMonths: number
  p25Months: number
  p75Months: number
  percentilePaths: GoalPercentilePathsDto
  resolvedParameters: GoalSimulationParametersDto
  insights: string[]
  isAchievable: boolean
  monthLabels: string[]
}

export interface CreateGoalPayload {
  name: string
  targetAmount: number
  currencyCode: string
}

export interface UpdateGoalPayload {
  name: string
  targetAmount: number
  parameterOverridesJson?: string | null
}
```

**Step 2: Add API methods to `api.service.ts`**

Add imports at the top of the file:
```typescript
import type {
  // ... existing imports ...
  GoalDto,
  GoalSimulationRequestDto,
  GoalSimulationResultDto,
  CreateGoalPayload,
  UpdateGoalPayload,
} from '../types.ts'
```

Add these methods to the `apiService` object (near the end, before the closing `}`):
```typescript
  async getGoals(): Promise<GoalDto[]> {
    const response = await apiClient.get<GoalDto[]>('/goals')
    return response.data
  },

  async createGoal(payload: CreateGoalPayload): Promise<GoalDto> {
    const response = await apiClient.post<GoalDto>('/goals', payload)
    return response.data
  },

  async updateGoal(id: string, payload: UpdateGoalPayload): Promise<GoalDto> {
    const response = await apiClient.put<GoalDto>(`/goals/${id}`, payload)
    return response.data
  },

  async deleteGoal(id: string): Promise<void> {
    await apiClient.delete(`/goals/${id}`)
  },

  async simulateGoal(id: string, request: GoalSimulationRequestDto): Promise<GoalSimulationResultDto> {
    const response = await apiClient.post<GoalSimulationResultDto>(`/goals/${id}/simulate`, request)
    return response.data
  },
```

---

## Task 8 — useGoals Composable

**Files:**
- Create: `vue-app/src/features/goals/composables/useGoals.ts`

```typescript
// vue-app/src/features/goals/composables/useGoals.ts
import { ref } from 'vue'
import { apiService } from '@/services/api.service.ts'
import type { GoalDto, CreateGoalPayload, UpdateGoalPayload } from '@/types.ts'
import type { ViewState } from '@/types/view-state.ts'

export function useGoals() {
  const goals = ref<GoalDto[]>([])
  const state = ref<ViewState>('empty')
  const error = ref<string | null>(null)
  const selectedGoalId = ref<string | null>(null)

  const selectedGoal = computed(() =>
    goals.value.find(g => g.id === selectedGoalId.value) ?? null
  )

  async function loadGoals() {
    state.value = 'loading'
    error.value = null
    try {
      goals.value = await apiService.getGoals()
      state.value = goals.value.length > 0 ? 'success' : 'empty'
      if (goals.value.length > 0 && !selectedGoalId.value) {
        selectedGoalId.value = goals.value[0].id
      }
    } catch (e) {
      error.value = 'Не удалось загрузить цели'
      state.value = 'error'
    }
  }

  async function createGoal(payload: CreateGoalPayload): Promise<GoalDto> {
    const goal = await apiService.createGoal(payload)
    goals.value.push(goal)
    state.value = 'success'
    selectedGoalId.value = goal.id
    return goal
  }

  async function updateGoal(id: string, payload: UpdateGoalPayload): Promise<GoalDto> {
    const updated = await apiService.updateGoal(id, payload)
    const idx = goals.value.findIndex(g => g.id === id)
    if (idx >= 0) goals.value[idx] = updated
    return updated
  }

  async function deleteGoal(id: string): Promise<void> {
    await apiService.deleteGoal(id)
    goals.value = goals.value.filter(g => g.id !== id)
    if (selectedGoalId.value === id) {
      selectedGoalId.value = goals.value[0]?.id ?? null
    }
    if (goals.value.length === 0) state.value = 'empty'
  }

  function selectGoal(id: string) {
    selectedGoalId.value = id
  }

  return { goals, state, error, selectedGoalId, selectedGoal, loadGoals, createGoal, updateGoal, deleteGoal, selectGoal }
}
```

Note: add `import { computed } from 'vue'` at the top (alongside `ref`).

---

## Task 9 — useGoalSimulation Composable

**Files:**
- Create: `vue-app/src/features/goals/composables/useGoalSimulation.ts`

```typescript
// vue-app/src/features/goals/composables/useGoalSimulation.ts
import { ref } from 'vue'
import { apiService } from '@/services/api.service.ts'
import type { GoalSimulationResultDto, GoalSimulationRequestDto } from '@/types.ts'

export function useGoalSimulation() {
  const result = ref<GoalSimulationResultDto | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0

  async function simulate(goalId: string, request: GoalSimulationRequestDto) {
    loading.value = true
    error.value = null
    const id = ++requestId

    try {
      const data = await apiService.simulateGoal(goalId, request)
      if (id !== requestId) return
      result.value = data
    } catch (e) {
      if (id !== requestId) return
      error.value = 'Не удалось запустить симуляцию'
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  function simulateDebounced(goalId: string, request: GoalSimulationRequestDto, delayMs = 500) {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    loading.value = true
    debounceTimer = setTimeout(() => simulate(goalId, request), delayMs)
  }

  function reset() {
    result.value = null
    error.value = null
    loading.value = false
    requestId++
    if (debounceTimer !== null) { clearTimeout(debounceTimer); debounceTimer = null }
  }

  return { result, loading, error, simulate, simulateDebounced, reset }
}
```

---

## Task 10 — GoalFanChartCard Component

**Files:**
- Create: `vue-app/src/features/goals/components/GoalFanChartCard.vue`

The fan chart has 7 bands (P10/P20/P40/P50/P60/P80/P90) using Chart.js fill between adjacent datasets. The reference image shows: darkest band in center fanning out to lightest.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { ChartData } from 'chart.js'
import Chart from 'primevue/chart'
import Skeleton from 'primevue/skeleton'
import { useChartColors } from '@/composables/useChartColors.ts'
import type { GoalSimulationResultDto } from '@/types.ts'

const props = defineProps<{
  loading: boolean
  result: GoalSimulationResultDto | null
  targetAmount: number
  currencyCode: string
}>()

const { colors } = useChartColors()

// Primary color with varying opacity for the fan bands
// Outer bands = low opacity, inner band (P40-P60) = high opacity
const primary = getComputedStyle(document.documentElement)
  .getPropertyValue('--ft-primary-400').trim() || '#D4DE95'

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

const chartData = computed((): ChartData<'line', number[], string> | null => {
  const r = props.result
  if (!r || !r.percentilePaths) return null

  const p = r.percentilePaths
  const labels = r.monthLabels
  const rgb = hexToRgb(primary)

  // Datasets ordered outer→inner (for fill: '+1' to work correctly)
  // Chart.js fills from this dataset UP to the next dataset
  return {
    labels,
    datasets: [
      // P10 — outer lower bound (fills up to P90 via fill '+6', but we use separate fills)
      {
        label: 'P10',
        data: p.p10,
        borderColor: `rgba(${rgb}, 0.15)`,
        backgroundColor: `rgba(${rgb}, 0.06)`,
        borderWidth: 1,
        pointRadius: 0,
        fill: '+6', // fill to P90 dataset (6 datasets above)
        tension: 0.3,
      },
      // P20
      {
        label: 'P20',
        data: p.p20,
        borderColor: `rgba(${rgb}, 0.2)`,
        backgroundColor: `rgba(${rgb}, 0.08)`,
        borderWidth: 1,
        pointRadius: 0,
        fill: '+4', // fill to P80
        tension: 0.3,
      },
      // P40
      {
        label: 'P40',
        data: p.p40,
        borderColor: `rgba(${rgb}, 0.3)`,
        backgroundColor: `rgba(${rgb}, 0.15)`,
        borderWidth: 1,
        pointRadius: 0,
        fill: '+2', // fill to P60
        tension: 0.3,
      },
      // P50 — median (bold central line)
      {
        label: 'Медиана',
        data: p.p50,
        borderColor: `rgba(${rgb}, 1)`,
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      },
      // P60
      {
        label: 'P60',
        data: p.p60,
        borderColor: `rgba(${rgb}, 0.3)`,
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      },
      // P80
      {
        label: 'P80',
        data: p.p80,
        borderColor: `rgba(${rgb}, 0.2)`,
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      },
      // P90 — outer upper bound
      {
        label: 'P90',
        data: p.p90,
        borderColor: `rgba(${rgb}, 0.15)`,
        backgroundColor: 'transparent',
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      },
      // Target line (horizontal dashed)
      {
        label: 'Цель',
        data: props.result?.monthLabels.map(() => props.targetAmount) ?? [],
        borderColor: 'var(--ft-danger-400)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  animation: false,
  scales: {
    x: {
      ticks: {
        color: 'var(--ft-text-muted)',
        maxTicksLimit: 8,
        font: { size: 11 },
      },
      grid: { color: 'var(--ft-border-subtle)' },
    },
    y: {
      ticks: {
        color: 'var(--ft-text-muted)',
        font: { size: 11 },
        callback: (v: number) =>
          new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(v),
      },
      grid: { color: 'var(--ft-border-subtle)' },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          if (!ctx.raw) return ''
          return `${ctx.dataset.label}: ${new Intl.NumberFormat('ru-RU', {
            style: 'currency', currency: props.currencyCode, maximumFractionDigits: 0,
          }).format(ctx.raw)}`
        },
      },
    },
  },
}))
</script>

<template>
  <div class="fan-chart-card">
    <div v-if="loading" class="fan-chart-skeleton">
      <Skeleton height="300px" />
    </div>
    <div
      v-else-if="result && chartData"
      class="fan-chart-container"
      role="img"
      :aria-label="`График симуляции Монте-Карло для цели ${targetAmount} ${currencyCode}`"
    >
      <Chart type="line" :data="chartData" :options="chartOptions" />
    </div>
    <div v-else class="fan-chart-empty">
      <p>Нет данных для отображения</p>
    </div>
  </div>
</template>

<style scoped>
.fan-chart-card {
  width: 100%;
}
.fan-chart-container {
  height: 300px;
  width: 100%;
}
.fan-chart-skeleton,
.fan-chart-empty {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

---

## Task 11 — GoalParametersPanel Component

**Files:**
- Create: `vue-app/src/features/goals/components/GoalParametersPanel.vue`

Each field shows `авто` badge when value is from analytics, `изменено` if user-set. "Сбросить" resets to auto.

```vue
<script setup lang="ts">
import { reactive, watch } from 'vue'
import InputNumber from 'primevue/inputnumber'
import type { GoalSimulationParametersDto, GoalParameterOverrides } from '@/types.ts'

const props = defineProps<{
  resolvedParams: GoalSimulationParametersDto | null
  modelValue: GoalParameterOverrides
}>()

const emit = defineEmits<{
  'update:modelValue': [overrides: GoalParameterOverrides]
}>()

// Internal state: track which fields are overridden
const overrides = reactive<GoalParameterOverrides>({ ...props.modelValue })

watch(() => props.modelValue, (v) => Object.assign(overrides, v), { deep: true })

function isOverridden(field: keyof GoalParameterOverrides): boolean {
  return overrides[field] != null
}

function getDisplayValue(field: keyof GoalParameterOverrides): number {
  return overrides[field] ?? (props.resolvedParams as any)?.[field] ?? 0
}

function onFieldChange(field: keyof GoalParameterOverrides, value: number | null) {
  overrides[field] = value
  emit('update:modelValue', { ...overrides })
}

function resetField(field: keyof GoalParameterOverrides) {
  overrides[field] = null
  emit('update:modelValue', { ...overrides })
}

const fields: Array<{
  key: keyof GoalParameterOverrides
  label: string
  suffix: string
  isPercent: boolean
  min: number
  max: number
}> = [
  { key: 'initialCapital', label: 'Начальный капитал', suffix: '', isPercent: false, min: 0, max: 1e12 },
  { key: 'monthlyIncome', label: 'Ежемес. доход', suffix: '/мес', isPercent: false, min: 0, max: 1e9 },
  { key: 'monthlyExpenses', label: 'Ежемес. расходы', suffix: '/мес', isPercent: false, min: 0, max: 1e9 },
  { key: 'annualReturnRate', label: 'Доходность инвестиций', suffix: '/год', isPercent: true, min: 0, max: 1 },
  { key: 'annualInflationRate', label: 'Инфляция', suffix: '/год', isPercent: true, min: 0, max: 1 },
]
</script>

<template>
  <div class="params-panel">
    <div v-for="field in fields" :key="field.key" class="param-row">
      <div class="param-label">
        <span>{{ field.label }}</span>
        <span v-if="!isOverridden(field.key)" class="badge badge--auto">авто</span>
        <span v-else class="badge badge--changed">изменено</span>
      </div>
      <div class="param-input-row">
        <InputNumber
          :model-value="getDisplayValue(field.key)"
          :min="field.min"
          :max="field.max"
          :min-fraction-digits="field.isPercent ? 1 : 0"
          :max-fraction-digits="field.isPercent ? 1 : 0"
          :suffix="field.isPercent ? '%' : ''"
          :prefix="field.isPercent ? '' : ''"
          locale="ru-RU"
          @update:model-value="(v) => onFieldChange(field.key, field.isPercent ? (v ?? null) / 100 : v ?? null)"
        />
        <button
          v-if="isOverridden(field.key)"
          class="reset-btn"
          @click="resetField(field.key)"
        >
          сбросить
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.params-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
}
.param-row {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}
.param-label {
  display: flex;
  align-items: center;
  gap: var(--ft-space-2);
  font-size: var(--ft-font-sm);
  color: var(--ft-text-muted);
}
.badge {
  font-size: 0.65rem;
  padding: 1px 5px;
  border-radius: var(--ft-radius-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.badge--auto {
  background: color-mix(in srgb, var(--ft-success-400) 15%, transparent);
  color: var(--ft-success-400);
}
.badge--changed {
  background: color-mix(in srgb, var(--ft-warning-400) 15%, transparent);
  color: var(--ft-warning-400);
}
.param-input-row {
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
}
.reset-btn {
  font-size: var(--ft-font-sm);
  color: var(--ft-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.reset-btn:hover {
  color: var(--ft-text-base);
}
</style>
```

**Note on percent display:** The backend stores `annualReturnRate` as a decimal (0.10 = 10%). The InputNumber shows it multiplied by 100 as percentage. On change, divide by 100 before storing in overrides. Adjust `getDisplayValue` for percent fields:

In `getDisplayValue`, for percent fields multiply by 100:
```typescript
function getDisplayValue(field: (typeof fields)[number]): number {
  const raw = overrides[field.key] ?? (props.resolvedParams as any)?.[field.key] ?? 0
  return field.isPercent ? (raw as number) * 100 : (raw as number)
}
```

Replace the simpler `getDisplayValue` in the template with this version.

---

## Task 12 — GoalInsightsPanel + GoalEmptyState

**Files:**
- Create: `vue-app/src/features/goals/components/GoalInsightsPanel.vue`
- Create: `vue-app/src/features/goals/components/GoalEmptyState.vue`

**GoalInsightsPanel.vue:**

```vue
<script setup lang="ts">
defineProps<{ insights: string[] }>()
</script>

<template>
  <div v-if="insights.length" class="insights-panel">
    <p v-for="(insight, i) in insights" :key="i" class="insight-item">
      <span class="insight-dot">·</span>
      {{ insight }}
    </p>
  </div>
</template>

<style scoped>
.insights-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-3);
}
.insight-item {
  font-size: var(--ft-font-sm);
  color: var(--ft-text-muted);
  margin: 0;
  line-height: 1.5;
}
.insight-dot {
  color: var(--ft-primary-400);
  font-weight: 700;
  margin-right: var(--ft-space-2);
}
</style>
```

**GoalEmptyState.vue:**

```vue
<script setup lang="ts">
const emit = defineEmits<{ 'create': [] }>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <i class="pi pi-bullseye" />
    </div>
    <h3>Нет целей</h3>
    <p>Создайте первую финансовую цель и получите прогноз на основе ваших данных</p>
    <button class="create-btn" @click="emit('create')">+ Новая цель</button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  gap: var(--ft-space-4);
  text-align: center;
  padding: var(--ft-space-8);
}
.empty-icon {
  font-size: 3rem;
  color: var(--ft-text-muted);
  opacity: 0.4;
}
.empty-state h3 {
  font-size: var(--ft-font-lg);
  font-weight: 600;
  margin: 0;
}
.empty-state p {
  color: var(--ft-text-muted);
  max-width: 320px;
  margin: 0;
  font-size: var(--ft-font-sm);
}
.create-btn {
  padding: var(--ft-space-3) var(--ft-space-6);
  background: var(--ft-primary-400);
  color: var(--ft-surface-base);
  border: none;
  border-radius: var(--ft-radius-md);
  font-weight: 600;
  cursor: pointer;
  font-size: var(--ft-font-sm);
}
.create-btn:hover {
  background: var(--ft-primary-200);
}
</style>
```

---

## Task 13 — GoalListPanel Component

**Files:**
- Create: `vue-app/src/features/goals/components/GoalListPanel.vue`

```vue
<script setup lang="ts">
import type { GoalDto } from '@/types.ts'

const props = defineProps<{
  goals: GoalDto[]
  selectedId: string | null
  currency: string
}>()

const emit = defineEmits<{
  select: [id: string]
  create: []
  delete: [id: string]
}>()

function formatProb(goal: GoalDto): string {
  // probability is stored in simulation result, not in goal.
  // Show '-' if not cached
  return '-'
}
</script>

<template>
  <div class="goal-list">
    <div class="goal-list__header">
      <span class="goal-list__title">Цели</span>
      <button class="create-btn" @click="emit('create')">
        <i class="pi pi-plus" />
      </button>
    </div>
    <div class="goal-list__items">
      <button
        v-for="goal in goals"
        :key="goal.id"
        class="goal-item"
        :class="{ 'goal-item--active': goal.id === selectedId }"
        @click="emit('select', goal.id)"
      >
        <div class="goal-item__name">{{ goal.name }}</div>
        <div class="goal-item__meta">
          {{ new Intl.NumberFormat('ru-RU', { style: 'currency', currency: goal.currencyCode, maximumFractionDigits: 0 }).format(goal.targetAmount) }}
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.goal-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid var(--ft-border-subtle);
}
.goal-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ft-space-4) var(--ft-space-4);
  border-bottom: 1px solid var(--ft-border-subtle);
}
.goal-list__title {
  font-size: var(--ft-font-sm);
  font-weight: 600;
  color: var(--ft-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.create-btn {
  background: none;
  border: none;
  color: var(--ft-primary-400);
  cursor: pointer;
  padding: var(--ft-space-1);
  border-radius: var(--ft-radius-sm);
  display: flex;
  align-items: center;
}
.create-btn:hover { color: var(--ft-primary-200); }
.goal-list__items {
  flex: 1;
  overflow-y: auto;
  padding: var(--ft-space-2) 0;
}
.goal-item {
  width: 100%;
  background: none;
  border: none;
  text-align: left;
  padding: var(--ft-space-3) var(--ft-space-4);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background 0.15s;
}
.goal-item:hover { background: var(--ft-surface-hover); }
.goal-item--active {
  border-left-color: var(--ft-primary-400);
  background: color-mix(in srgb, var(--ft-primary-400) 8%, transparent);
}
.goal-item__name {
  font-size: var(--ft-font-sm);
  font-weight: 500;
  color: var(--ft-text-base);
}
.goal-item__meta {
  font-size: 0.75rem;
  color: var(--ft-text-muted);
  margin-top: 1px;
  font-variant-numeric: tabular-nums;
}
</style>
```

---

## Task 14 — GoalDetailPanel Component

**Files:**
- Create: `vue-app/src/features/goals/components/GoalDetailPanel.vue`

This orchestrates: headline metrics, fan chart, parameters panel, insights panel. It calls simulate on mount and when parameters change.

```vue
<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import Message from 'primevue/message'
import GoalFanChartCard from './GoalFanChartCard.vue'
import GoalParametersPanel from './GoalParametersPanel.vue'
import GoalInsightsPanel from './GoalInsightsPanel.vue'
import { useGoalSimulation } from '../composables/useGoalSimulation.ts'
import type { GoalDto, GoalParameterOverrides } from '@/types.ts'

const props = defineProps<{ goal: GoalDto }>()

const { result, loading, error, simulateDebounced } = useGoalSimulation()

// Parse stored overrides from goal
const storedOverrides = computed((): GoalParameterOverrides => {
  if (!props.goal.parameterOverridesJson) return {}
  try { return JSON.parse(props.goal.parameterOverridesJson) }
  catch { return {} }
})

const overrides = ref<GoalParameterOverrides>({ ...storedOverrides.value })

// Build request from current overrides
function buildRequest() {
  return {
    initialCapital: overrides.value.initialCapital ?? null,
    monthlyIncome: overrides.value.monthlyIncome ?? null,
    monthlyExpenses: overrides.value.monthlyExpenses ?? null,
    annualReturnRate: overrides.value.annualReturnRate ?? null,
    annualInflationRate: overrides.value.annualInflationRate ?? null,
    horizonMonths: null,
  }
}

function runSimulation(debounce = false) {
  if (debounce) simulateDebounced(props.goal.id, buildRequest())
  else simulateDebounced(props.goal.id, buildRequest(), 0)
}

onMounted(() => runSimulation())
watch(() => props.goal.id, () => {
  overrides.value = { ...storedOverrides.value }
  runSimulation()
})

function onOverridesChange(newOverrides: GoalParameterOverrides) {
  overrides.value = newOverrides
  runSimulation(true) // debounced
}

const fmt = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

function fmtMonths(months: number): string {
  if (months <= 0) return '—'
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts: string[] = []
  if (y > 0) parts.push(`${y} г.`)
  if (m > 0) parts.push(`${m} мес.`)
  return parts.join(' ')
}

function fmtDate(monthsFromNow: number): string {
  if (monthsFromNow <= 0) return '—'
  const d = new Date()
  d.setMonth(d.getMonth() + monthsFromNow)
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="goal-detail">
    <!-- Header -->
    <div class="goal-detail__header">
      <h2 class="goal-detail__name">{{ goal.name }}</h2>
      <div class="goal-detail__target">
        {{ new Intl.NumberFormat('ru-RU', { style: 'currency', currency: goal.currencyCode, maximumFractionDigits: 0 }).format(goal.targetAmount) }}
      </div>
    </div>

    <!-- Unachievable warning -->
    <Message v-if="result && !result.isAchievable" severity="warn">
      При текущих параметрах цель недостижима — расходы превышают доходы
    </Message>

    <!-- KPI strip -->
    <div v-if="result && result.isAchievable" class="goal-kpis">
      <div class="kpi">
        <div class="kpi__value">{{ Math.round(result.probability * 100) }}%</div>
        <div class="kpi__label">вероятность</div>
      </div>
      <div class="kpi">
        <div class="kpi__value">{{ fmtDate(result.medianMonths) }}</div>
        <div class="kpi__label">медиана</div>
      </div>
      <div class="kpi">
        <div class="kpi__value">{{ fmtDate(result.p25Months) }} — {{ fmtDate(result.p75Months) }}</div>
        <div class="kpi__label">диапазон P25–P75</div>
      </div>
    </div>

    <!-- Fan chart -->
    <GoalFanChartCard
      :loading="loading"
      :result="result"
      :target-amount="goal.targetAmount"
      :currency-code="goal.currencyCode"
    />

    <!-- Parameters + Insights -->
    <div class="goal-detail__bottom">
      <div class="goal-detail__section">
        <h4 class="section-title">Параметры</h4>
        <GoalParametersPanel
          :resolved-params="result?.resolvedParameters ?? null"
          :model-value="overrides"
          @update:model-value="onOverridesChange"
        />
      </div>
      <div v-if="result?.insights?.length" class="goal-detail__section">
        <h4 class="section-title">Инсайты</h4>
        <GoalInsightsPanel :insights="result.insights" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.goal-detail {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-6);
  padding: var(--ft-space-6);
  overflow-y: auto;
  height: 100%;
}
.goal-detail__header {
  display: flex;
  align-items: baseline;
  gap: var(--ft-space-4);
  flex-wrap: wrap;
}
.goal-detail__name {
  font-size: var(--ft-font-xl);
  font-weight: 700;
  margin: 0;
}
.goal-detail__target {
  font-size: var(--ft-font-lg);
  color: var(--ft-text-muted);
  font-variant-numeric: tabular-nums;
}
.goal-kpis {
  display: flex;
  gap: var(--ft-space-8);
  flex-wrap: wrap;
}
.kpi__value {
  font-size: var(--ft-font-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.kpi__label {
  font-size: var(--ft-font-xs);
  color: var(--ft-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.goal-detail__bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ft-space-8);
}
@media (max-width: 768px) {
  .goal-detail__bottom { grid-template-columns: 1fr; }
  .goal-kpis { gap: var(--ft-space-4); }
}
.section-title {
  font-size: var(--ft-font-sm);
  font-weight: 600;
  color: var(--ft-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 var(--ft-space-3);
}
</style>
```

---

## Task 15 — GoalsPage + Routing + Navigation

**Files:**
- Create: `vue-app/src/pages/GoalsPage.vue`
- Modify: `vue-app/src/router/index.ts`
- Modify: `vue-app/src/composables/useAppShellState.ts`

**Step 1: GoalsPage.vue**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import GoalListPanel from '@/features/goals/components/GoalListPanel.vue'
import GoalDetailPanel from '@/features/goals/components/GoalDetailPanel.vue'
import GoalEmptyState from '@/features/goals/components/GoalEmptyState.vue'
import { useGoals } from '@/features/goals/composables/useGoals.ts'

const { goals, state, selectedGoal, selectedGoalId, loadGoals, createGoal, deleteGoal, selectGoal } = useGoals()

// New goal dialog
const showCreateDialog = ref(false)
const newGoalName = ref('')
const newGoalAmount = ref<number>(1_000_000)
const newGoalCurrency = ref('RUB')
const creating = ref(false)

const currencies = [
  { label: 'RUB ₽', value: 'RUB' },
  { label: 'USD $', value: 'USD' },
  { label: 'EUR €', value: 'EUR' },
]

function openCreateDialog() {
  newGoalName.value = ''
  newGoalAmount.value = 1_000_000
  newGoalCurrency.value = 'RUB'
  showCreateDialog.value = true
}

async function submitCreate() {
  if (!newGoalName.value.trim() || !newGoalAmount.value) return
  creating.value = true
  try {
    await createGoal({
      name: newGoalName.value.trim(),
      targetAmount: newGoalAmount.value,
      currencyCode: newGoalCurrency.value,
    })
    showCreateDialog.value = false
  } finally {
    creating.value = false
  }
}

onMounted(loadGoals)
</script>

<template>
  <div class="goals-page">
    <!-- Empty state -->
    <div v-if="state === 'empty'" class="goals-page__empty">
      <GoalEmptyState @create="openCreateDialog" />
    </div>

    <!-- Main layout: list + detail -->
    <template v-else>
      <div class="goals-layout">
        <div class="goals-layout__list">
          <GoalListPanel
            :goals="goals"
            :selected-id="selectedGoalId"
            currency="RUB"
            @select="selectGoal"
            @create="openCreateDialog"
            @delete="deleteGoal"
          />
        </div>
        <div class="goals-layout__detail">
          <GoalDetailPanel v-if="selectedGoal" :goal="selectedGoal" />
        </div>
      </div>
    </template>

    <!-- Create Goal Dialog -->
    <Dialog v-model:visible="showCreateDialog" header="Новая цель" :modal="true" :style="{ width: '400px' }">
      <div class="create-form">
        <div class="form-field">
          <label>Название</label>
          <InputText v-model="newGoalName" placeholder="Например: Капитал 10 млн" fluid />
        </div>
        <div class="form-field">
          <label>Целевая сумма</label>
          <InputNumber v-model="newGoalAmount" :min="1" locale="ru-RU" fluid />
        </div>
        <div class="form-field">
          <label>Валюта</label>
          <Select v-model="newGoalCurrency" :options="currencies" option-label="label" option-value="value" fluid />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showCreateDialog = false">Отмена</button>
        <button class="btn-primary" :disabled="creating || !newGoalName.trim()" @click="submitCreate">
          {{ creating ? 'Создаю...' : 'Создать' }}
        </button>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.goals-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.goals-page__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.goals-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  overflow: hidden;
}
@media (max-width: 768px) {
  .goals-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}
.goals-layout__list {
  overflow: hidden;
}
.goals-layout__detail {
  overflow-y: auto;
}
.create-form {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-4);
  padding: var(--ft-space-4) 0;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--ft-space-2);
}
.form-field label {
  font-size: var(--ft-font-sm);
  color: var(--ft-text-muted);
}
.btn-primary, .btn-secondary {
  padding: var(--ft-space-2) var(--ft-space-5);
  border-radius: var(--ft-radius-md);
  border: none;
  cursor: pointer;
  font-size: var(--ft-font-sm);
  font-weight: 500;
}
.btn-primary {
  background: var(--ft-primary-400);
  color: var(--ft-surface-base);
}
.btn-primary:disabled { opacity: 0.5; cursor: default; }
.btn-secondary {
  background: var(--ft-surface-elevated);
  color: var(--ft-text-base);
}
</style>
```

**Step 2: Add route to `router/index.ts`**

Add after the `/reflections/:month` route:
```typescript
{
  path: '/goals',
  name: 'goals',
  component: () => import('../pages/GoalsPage.vue'),
  meta: { title: 'Цели', requiresAuth: true },
},
```

**Step 3: Add nav item to `composables/useAppShellState.ts`**

In the `primaryNavItems` array, add after Investments:
```typescript
{ label: 'Цели', icon: 'pi-bullseye', to: '/goals', badge: null },
```

---

## Verification Checklist

1. **Migration ran:** Table `Goals` exists in database with columns: `Id`, `UserId`, `Name`, `TargetAmount`, `CurrencyCode`, `ParameterOverridesJson`, `CreatedAt`, `UpdatedAt`, `DeletedAt`, `IsDeleted`

2. **Backend CRUD:**
   - `POST /api/goals` with `{ name: "Test", targetAmount: 1000000, currencyCode: "RUB" }` → 201 Created
   - `GET /api/goals` → array with the new goal
   - `PUT /api/goals/{id}` → 200 OK
   - `DELETE /api/goals/{id}` → 204 No Content

3. **Simulation:**
   - `POST /api/goals/{id}/simulate` with empty body `{}` → result with `probability`, `percentilePaths`, `insights`
   - Same with `{ "monthlyExpenses": 50000 }` override → different probability
   - With `{ "monthlyIncome": 1000, "monthlyExpenses": 999 }` → `isAchievable: false`

4. **Frontend:**
   - Navigate to `/goals` → empty state shown if no goals
   - Create a goal via dialog → list updates, detail panel appears
   - Fan chart renders with multiple bands
   - Change a parameter → chart re-renders after ~500ms, `изменено` badge appears
   - "Сбросить" restores `авто` badge
   - Mobile (640px): layout stacks vertically

5. **Nav:** "Цели" appears in sidebar between "Инвестиции" and "Рефлексии"
