using FinTree.Application.Analytics;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AnalyticsController(AnalyticsService analyticsService) : ControllerBase
    {
        [HttpGet("monthly-expenses")]
        public async Task<IActionResult> GetMonthlyExpenses()
        {
            var data = await analyticsService.GetMonthlyExpensesAsync();
            return Ok(data);
        }
    }
}
