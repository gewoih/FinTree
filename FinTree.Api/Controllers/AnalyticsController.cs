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
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard([FromQuery] int year, [FromQuery] int month, CancellationToken ct)
        {
            var data = await analyticsService.GetDashboardAsync(year, month, ct);
            return Ok(data);
        }

        [HttpGet("future-income")]
        public async Task<IActionResult> GetFutureIncome(CancellationToken ct)
        {
            var data = await analyticsService.GetFutureIncomeOverviewAsync(ct);
            return Ok(data);
        }

        [HttpGet("net-worth")]
        public async Task<IActionResult> GetNetWorthTrend([FromQuery] int months = 12, CancellationToken ct = default)
        {
            var data = await analyticsService.GetNetWorthTrendAsync(months, ct);
            return Ok(data);
        }
    }
}
