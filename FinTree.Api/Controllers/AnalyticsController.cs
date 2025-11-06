using FinTree.Application.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AnalyticsController(AnalyticsService analyticsService) : ControllerBase
    {
        [HttpGet("financial-health")]
        public async Task<IActionResult> GetFinancialHealth([FromQuery] int months, CancellationToken ct)
        {
            var data = await analyticsService.GetFinancialHealthMetricsAsync(months, ct);
            return Ok(data);
        }

        [HttpGet("monthly-expenses")]
        public async Task<IActionResult> GetMonthlyExpenses()
        {
            var data = await analyticsService.GetMonthlyExpensesAsync();
            return Ok(data);
        }

        [HttpGet("expenses-by-category")]
        public async Task<IActionResult> GetExpensesByCategory([FromQuery] int year, [FromQuery] int month,
            CancellationToken ct)
        {
            var data = await analyticsService.GetExpensesByCategoryAsync(year, month, ct);
            return Ok(data);
        }

        [HttpGet("expenses-by-category-range")]
        public async Task<IActionResult> GetExpensesByCategoryRange([FromQuery] DateTime from, [FromQuery] DateTime to,
            CancellationToken ct)
        {
            var data = await analyticsService.GetExpensesByCategoryByDateRangeAsync(from, to, ct);
            return Ok(data);
        }

        [HttpGet("expenses-by-granularity")]
        public async Task<IActionResult> GetExpensesByGranularity([FromQuery] string granularity, CancellationToken ct)
        {
            var data = await analyticsService.GetExpensesByGranularityAsync(granularity, ct);
            return Ok(data);
        }

        [HttpGet("networth-trend")]
        public async Task<IActionResult> GetNetWorthTrend(CancellationToken ct)
        {
            var data = await analyticsService.GetNetWorthTrendAsync(ct: ct);
            return Ok(data);
        }

        [HttpGet("future-income")]
        public async Task<IActionResult> GetFutureIncome(CancellationToken ct)
        {
            var data = await analyticsService.GetFutureIncomeOverviewAsync(ct);
            return Ok(data);
        }
    }
}
