using FinTree.Application.Analytics.Dto;
using FinTree.Application.Analytics.Services.Metrics;
using FinTree.Application.Analytics.Shared;
using FinTree.Application.Currencies;
using FinTree.Application.Transactions;
using FinTree.Application.Users;
using FinTree.Domain.Transactions;

namespace FinTree.Application.Analytics.Services;

public sealed class DashboardService(
    TransactionsService transactionsService,
    CurrencyConverter currencyConverter,
    UserService userService,
    LiquidityService liquidityService,
    ForecastService forecastService,
    SpendingBreakdownService spendingBreakdownService)
{
    public async Task<AnalyticsDashboardDto> GetDashboardAsync(int year, int month, CancellationToken ct)
    {
        var baseCurrencyCode = await userService.GetCurrentUserBaseCurrencyCodeAsync(ct);

        var monthStartUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEndUtc = monthStartUtc.AddMonths(1);
        var previousMonthStartUtc = monthStartUtc.AddMonths(-1);
        var categoryBaselineStartUtc = monthStartUtc.AddMonths(-6);

        // SpendingBreakdown нужен самый широкий диапазон — 12 месяцев.
        // Остальные окна (MonthlyAggregator — 90 дней, Forecast — 180 дней) полностью входят в него.
        var prefetchWindowStartUtc = monthStartUtc.AddMonths(-11);

        var nowUtc = DateTime.UtcNow;

        var categories = (await userService.GetUserCategoriesAsync(ct))
            .ToDictionary(c => c.Id, c => new CategoryMeta(c.Name, c.Color, c.IsMandatory));

        const int requiredExpenseDays = 7;
        const int requiredStabilityDays = 1;
        var observedExpenseDays = await transactionsService.GetDistinctExpenseDaysCountAsync(ct);

        var rawTransactions = await transactionsService.GetTransactionSnapshotsAsync(
            fromUtc: prefetchWindowStartUtc,
            toUtc: monthEndUtc,
            excludeTransfers: true,
            excludeInvestmentAccounts: true,
            ct: ct);

        var rates = await currencyConverter.GetCrossRatesAsync(
            rawTransactions.Select(txn => (txn.Money.CurrencyCode, txn.OccurredAtUtc)),
            baseCurrencyCode,
            ct);

        // Конвертируем все транзакции в базовую валюту один раз.
        // Под-сервисы получают уже готовые суммы и не работают с курсами напрямую.
        var convertedTransactions = rawTransactions
            .Select(txn =>
            {
                var rateKey = (txn.Money.CurrencyCode, txn.OccurredAtUtc.Date);
                if (!rates.TryGetValue(rateKey, out var rate))
                    throw new InvalidOperationException(
                        $"Курс валюты {txn.Money.CurrencyCode} на {txn.OccurredAtUtc:yyyy-MM-dd} не найден в предзагруженных данных.");
                return new ConvertedTransactionSnapshot(
                    txn.OccurredAtUtc,
                    txn.Type,
                    txn.Money.Amount * rate,
                    txn.CategoryId,
                    txn.IsMandatory);
            })
            .ToList();

        var dataset = new AnalyticsDataset(convertedTransactions);

        // MonthlyAggregator работает с текущим и предыдущим месяцем — фильтруем из предзагруженного набора
        var aggregatorTransactions = convertedTransactions
            .Where(t => t.OccurredAtUtc >= previousMonthStartUtc && t.OccurredAtUtc < monthEndUtc)
            .ToList();

        var monthlyResult = MonthlyAggregator.Aggregate(
            aggregatorTransactions,
            monthStartUtc,
            monthEndUtc,
            previousMonthStartUtc,
            ct);

        var daysInMonth = DateTime.DaysInMonth(year, month);
        var isSelectedCurrentMonth = monthStartUtc.Year == nowUtc.Year && monthStartUtc.Month == nowUtc.Month;
        var observedDaysInMonth = isSelectedCurrentMonth
            ? Math.Min(nowUtc.Day, daysInMonth)
            : daysInMonth;

        var observedDailyValues = Enumerable.Range(1, observedDaysInMonth)
            .Select(day => monthlyResult.DailyTotals.GetValueOrDefault(new DateOnly(year, month, day), 0m))
            .ToList();

        var positiveObservedDailyValues = observedDailyValues.Where(v => v > 0m).ToList();
        var observedStabilityDaysInSelectedMonth = positiveObservedDailyValues.Count;

        var readiness = new AnalyticsReadinessDto(
            observedExpenseDays >= requiredExpenseDays,
            observedExpenseDays,
            requiredExpenseDays,
            observedStabilityDaysInSelectedMonth >= requiredStabilityDays,
            observedStabilityDaysInSelectedMonth,
            requiredStabilityDays);

        var meanDaily = observedDailyValues.Count > 0 ? observedDailyValues.Average() : (decimal?)null;
        var medianDaily = positiveObservedDailyValues.Count > 0
            ? MathService.ComputeMedian(positiveObservedDailyValues)
            : null;

        var netCashflow = monthlyResult.TotalIncome - monthlyResult.TotalExpenses;
        var monthOverMonth = monthlyResult.PreviousMonthExpenses > 0m
            ? (monthlyResult.TotalExpenses - monthlyResult.PreviousMonthExpenses) / monthlyResult.PreviousMonthExpenses * 100
            : (decimal?)null;
        var incomeMoM = monthlyResult.PreviousMonthIncome > 0m
            ? (monthlyResult.TotalIncome - monthlyResult.PreviousMonthIncome) / monthlyResult.PreviousMonthIncome * 100
            : (decimal?)null;

        var previousNetCashflow = monthlyResult.PreviousMonthIncome - monthlyResult.PreviousMonthExpenses;
        // Math.Abs: процент отражает направление изменения, а не знак предыдущего кешфлоу.
        var balanceMoM = previousNetCashflow != 0m
            ? (netCashflow - previousNetCashflow) / Math.Abs(previousNetCashflow) * 100
            : (decimal?)null;

        var liquidityAtUtc = isSelectedCurrentMonth ? nowUtc : monthEndUtc;
        var liquidity = await liquidityService.ComputeLiquidity(baseCurrencyCode, liquidityAtUtc, ct);

        var monthScore = MonthScoreBuilder.Build(new MonthScoreInputs(
            MonthIncome: monthlyResult.TotalIncome,
            MonthExpenses: monthlyResult.TotalExpenses,
            DiscretionaryTotal: monthlyResult.DiscretionaryTotal,
            StabilityPositiveDailyValues: positiveObservedDailyValues,
            LiquidMonths: liquidity.LiquidMonths));

        var savingsRate = monthScore.SavingsRate;
        var discretionaryShare = monthScore.DiscretionarySharePercent;
        var stability = monthScore.Stability;
        var totalMonthScoreValue = MathService.ToScore(monthScore.TotalMonthScore);

        // Статусы карточек считаются из тех же порогов, что и баллы оценки месяца.
        var savingsStatus = savingsRate.HasValue
            ? HealthStatus.HigherIsBetter(
                savingsRate.Value * 100m,
                HealthThresholds.SavingsRateTargetPercent,
                HealthThresholds.SavingsRateAveragePercent)
            : null;
        var discretionaryStatus = discretionaryShare.HasValue
            ? HealthStatus.LowerIsBetter(
                discretionaryShare.Value,
                HealthThresholds.DiscretionaryShareTargetPercent,
                HealthThresholds.DiscretionaryShareAveragePercent)
            : null;

        var categoryBaseline = BuildCategoryBaseline(
            convertedTransactions, categoryBaselineStartUtc, monthStartUtc, observedDaysInMonth);
        var categoryDelta = CategoryDeltaService.GetCategoryDeltas(
            monthlyResult.ExpenseCategoryTotals,
            categoryBaseline,
            categories);

        var previousMonthPositiveDailyValues = monthlyResult.PreviousMonthDailyTotals.Values
            .Where(value => value > 0m)
            .ToList();
        var previousLiquidity = await liquidityService.ComputeLiquidity(baseCurrencyCode, monthStartUtc, ct);
        var previousMonthScore = MonthScoreBuilder.Build(new MonthScoreInputs(
            MonthIncome: monthlyResult.PreviousMonthIncome,
            MonthExpenses: monthlyResult.PreviousMonthExpenses,
            DiscretionaryTotal: monthlyResult.PreviousMonthDiscretionaryTotal,
            StabilityPositiveDailyValues: previousMonthPositiveDailyValues,
            LiquidMonths: previousLiquidity.LiquidMonths));
        var previousTotalMonthScoreValue = MathService.ToScore(previousMonthScore.TotalMonthScore);
        var totalMonthScoreDeltaPoints =
            totalMonthScoreValue.HasValue && previousTotalMonthScoreValue.HasValue
                ? totalMonthScoreValue.Value - previousTotalMonthScoreValue.Value
                : (int?)null;

        // Неснижаемая база: медиана ежемесячных сумм обязательных трат
        // за 6 полных месяцев, предшествующих выбранному. MoM-дельта — окно,
        // сдвинутое на месяц назад. Окна берутся завершёнными, чтобы текущий
        // (возможно неполный) месяц не занижал базу.
        var essentialBaselineMonthly = ComputeEssentialBaseline(
            convertedTransactions, monthStartUtc.AddMonths(-6), monthStartUtc);
        var previousEssentialBaselineMonthly = ComputeEssentialBaseline(
            convertedTransactions, monthStartUtc.AddMonths(-7), monthStartUtc.AddMonths(-1));
        var essentialBaselineChangePercent = essentialBaselineMonthly.HasValue
            && previousEssentialBaselineMonthly.HasValue
            && previousEssentialBaselineMonthly.Value > 0m
                ? (essentialBaselineMonthly.Value - previousEssentialBaselineMonthly.Value)
                    / previousEssentialBaselineMonthly.Value * 100m
                : (decimal?)null;

        var health = new FinancialHealthSummaryDto(
            MonthIncome: MathService.Round2(monthlyResult.TotalIncome),
            MonthTotal: MathService.Round2(monthlyResult.TotalExpenses),
            MeanDaily: meanDaily.HasValue ? MathService.Round2(meanDaily.Value) : null,
            MedianDaily: medianDaily.HasValue ? MathService.Round2(medianDaily.Value) : null,
            StabilityIndex: stability?.Index,
            StabilityScore: MathService.ToScore(stability?.Score),
            StabilityStatus: stability?.Status,
            StabilityActionCode: stability?.ActionCode,
            StabilityIsPreview: stability?.IsPreview ?? false,
            SavingsRate: savingsRate,
            SavingsStatus: savingsStatus,
            NetCashflow: MathService.Round2(netCashflow),
            DiscretionaryTotal: MathService.Round2(monthlyResult.DiscretionaryTotal),
            DiscretionarySharePercent: discretionaryShare,
            DiscretionaryStatus: discretionaryStatus,
            MonthOverMonthChangePercent: monthOverMonth,
            LiquidAssets: MathService.Round2(liquidity.LiquidAssets),
            LiquidMonths: liquidity.LiquidMonths,
            LiquidMonthsStatus: liquidity.Status,
            TotalMonthScore: totalMonthScoreValue,
            TotalMonthScoreDeltaPoints: totalMonthScoreDeltaPoints,
            IncomeMonthOverMonthChangePercent: incomeMoM,
            BalanceMonthOverMonthChangePercent: balanceMoM,
            EssentialBaselineMonthly: essentialBaselineMonthly.HasValue
                ? MathService.Round2(essentialBaselineMonthly.Value)
                : null,
            EssentialBaselineMonthlyChangePercent: essentialBaselineChangePercent);

        var forecast = await forecastService.BuildForecastAsync(
            year, month, monthlyResult.DailyTotals.ToDictionary(), dataset, baseCurrencyCode, ct);

        // Only meaningful when income is tracked; null suppresses the callout on the frontend.
        var availableAmount = monthlyResult.TotalIncome > 0 && forecast.Summary.MedianTotal.HasValue
            ? MathService.Round2(monthlyResult.TotalIncome - forecast.Summary.MedianTotal.Value)
            : (decimal?)null;

        var updatedSummary = forecast.Summary with { AvailableAmount = availableAmount };
        forecast = forecast with { Summary = updatedSummary };

        var spending = spendingBreakdownService.Build(year, month, dataset, ct);

        return new AnalyticsDashboardDto(
            year,
            month,
            health,
            new CategoryBreakdownDto(
                CategoryItemBuilder.BuildExpenseItems(monthlyResult.ExpenseCategoryTotals, categories, monthlyResult.TotalExpenses),
                categoryDelta),
            new CategoryBreakdownDto(
                CategoryItemBuilder.BuildIncomeItems(monthlyResult.IncomeCategoryTotals, categories, monthlyResult.TotalIncome),
                new CategoryDeltaDto([], [])),
            spending,
            forecast,
            readiness,
            new HealthBenchmarksDto(
                HealthThresholds.SavingsRateTargetPercent,
                HealthThresholds.DiscretionaryShareTargetPercent,
                HealthThresholds.LiquidityMonthsTarget,
                HealthThresholds.StabilityGoodScore));
    }

    // Минимальное число «качественных» месяцев, при котором медиана базы
    // имеет смысл. Меньше 3 — медиана легко искажается одним выбросом
    // (годовая страховка, нетипичный месяц), и метрика вводит в заблуждение.
    private const int EssentialBaselineMinMonths = 3;

    // Неснижаемая база: медиана сумм обязательных расходов по «качественным»
    // месяцам окна. Месяц считается качественным, если:
    //   1) история пользователя началась до его начала (хотя бы одна транзакция
    //      раньше первого числа) — иначе месяц частичный и занижает базу;
    //   2) в нём есть хотя бы одна транзакция — иначе вероятен пропуск
    //      ведения (отпуск/забыл), и подмена реальной базы нулём.
    // Медиана выбрана осознанно: устойчива к разовым годовым платежам
    // (страховка, налоги), которые попадают в 1 месяц из 6.
    private static decimal? ComputeEssentialBaseline(
        IReadOnlyList<ConvertedTransactionSnapshot> convertedTransactions,
        DateTime windowStartUtc,
        DateTime windowEndUtc)
    {
        if (convertedTransactions.Count == 0)
            return null;

        // Самая ранняя транзакция в наборе — приближение к началу истории.
        // Prefetch покрывает 11 месяцев назад от выбранного, шире нашего
        // 6-месячного окна; если у пользователя истории больше — earliestUtc
        // будет заведомо раньше windowStartUtc и все месяцы окна — полные.
        var earliestUtc = convertedTransactions.Min(t => t.OccurredAtUtc);

        var hasAnyByMonth = new Dictionary<(int Year, int Month), bool>();
        var mandatoryByMonth = new Dictionary<(int Year, int Month), decimal>();

        foreach (var txn in convertedTransactions)
        {
            if (txn.OccurredAtUtc < windowStartUtc || txn.OccurredAtUtc >= windowEndUtc)
                continue;

            var monthStartUtc = new DateTime(
                txn.OccurredAtUtc.Year, txn.OccurredAtUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            // Месяц «полный» только если у пользователя была активность ДО его начала.
            if (earliestUtc >= monthStartUtc)
                continue;

            var key = (txn.OccurredAtUtc.Year, txn.OccurredAtUtc.Month);
            hasAnyByMonth[key] = true;

            if (txn.Type != TransactionType.Expense || !txn.IsMandatory)
                continue;

            mandatoryByMonth.TryGetValue(key, out var existing);
            mandatoryByMonth[key] = existing + txn.AmountInBaseCurrency;
        }

        if (hasAnyByMonth.Count < EssentialBaselineMinMonths)
            return null;

        var monthlyTotals = hasAnyByMonth.Keys
            .Select(key => mandatoryByMonth.GetValueOrDefault(key, 0m))
            .ToList();

        return MathService.ComputeMedian(monthlyTotals);
    }

    // База для виджета «Изменения по категориям»: ожидаемый расход категории
    // за уже прошедшие дни выбранного месяца, исходя из среднего за 6-месячное окно.
    // Окно — общее для всех категорий: от первой расходной транзакции пользователя
    // (но не раньше 6 месяцев назад) до начала выбранного месяца.
    private static IReadOnlyDictionary<Guid, decimal> BuildCategoryBaseline(
        IReadOnlyList<ConvertedTransactionSnapshot> convertedTransactions,
        DateTime windowStartUtc,
        DateTime windowEndUtc,
        int observedDaysInMonth)
    {
        var expenses = convertedTransactions
            .Where(t => t.Type == TransactionType.Expense && t.OccurredAtUtc < windowEndUtc)
            .ToList();

        if (expenses.Count == 0)
            return new Dictionary<Guid, decimal>();

        // Обрезаем окно по первой расходной транзакции: у нового пользователя
        // нельзя делить на все 6 месяцев — столько истории ещё нет.
        var firstExpenseUtc = expenses.Min(t => t.OccurredAtUtc);
        var effectiveStartUtc = firstExpenseUtc > windowStartUtc ? firstExpenseUtc.Date : windowStartUtc;
        var windowDays = (decimal)(windowEndUtc - effectiveStartUtc).TotalDays;
        if (windowDays <= 0m)
            return new Dictionary<Guid, decimal>();

        // base = суммаОкна / дниОкна * observedDaysInMonth — среднедневной расход
        // категории за окно, приведённый к числу уже прошедших дней месяца.
        return expenses
            .Where(t => t.OccurredAtUtc >= effectiveStartUtc)
            .GroupBy(t => t.CategoryId ?? Guid.Empty)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(t => t.AmountInBaseCurrency) * observedDaysInMonth / windowDays);
    }
}
