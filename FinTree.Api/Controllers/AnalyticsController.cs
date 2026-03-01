using FinTree.Application.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AnalyticsController(
        DashboardService dashboardService,
        NetWorthService netWorthService,
        EvolutionService evolutionService)
        : ControllerBase
    {
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard([FromQuery] int year, [FromQuery] int month, CancellationToken ct)
        {
            var data = await dashboardService.GetDashboardAsync(year, month, ct);
            return Ok(data);
        }

        [HttpGet("net-worth")]
        public async Task<IActionResult> GetNetWorthTrend([FromQuery] int months = 12, CancellationToken ct = default)
        {
            var data = await netWorthService.GetNetWorthTrendAsync(months, ct);
            return Ok(data);
        }

        [HttpGet("evolution")]
        public async Task<IActionResult> GetEvolution(
            [FromQuery] int months = 12,
            CancellationToken ct = default)
        {
            var data = await evolutionService.GetEvolutionAsync(months, ct);
            return Ok(data);
        }
    }
}