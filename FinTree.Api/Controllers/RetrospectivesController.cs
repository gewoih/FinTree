using FinTree.Application.Retrospectives;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public sealed class RetrospectivesController(RetrospectiveService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken ct)
    {
        var list = await service.GetListAsync(ct);
        return Ok(list);
    }

    [HttpGet("available-months")]
    public async Task<IActionResult> GetAvailableMonths(CancellationToken ct)
    {
        var months = await service.GetAvailableMonthsAsync(ct);
        return Ok(months);
    }

    [HttpGet("{month}")]
    public async Task<IActionResult> GetByMonth(string month, CancellationToken ct)
    {
        var dto = await service.GetByMonthAsync(month, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("banner/{month}")]
    public async Task<IActionResult> GetBannerStatus(string month, CancellationToken ct)
    {
        var exists = await service.HasRetrospectiveOrDismissalAsync(month, ct);
        return Ok(new { showBanner = !exists });
    }

    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] UpsertRetrospectiveCommand command, CancellationToken ct)
    {
        var dto = await service.UpsertAsync(command, ct);
        return Ok(dto);
    }

    [HttpPut("{month}")]
    public async Task<IActionResult> Update(string month, [FromBody] UpsertRetrospectiveCommand command, CancellationToken ct)
    {
        var merged = command with { Month = month };
        var dto = await service.UpsertAsync(merged, ct);
        return Ok(dto);
    }

    [HttpDelete("{month}")]
    public async Task<IActionResult> Delete(string month, CancellationToken ct)
    {
        await service.DeleteAsync(month, ct);
        return NoContent();
    }

    [HttpPost("{month}/dismiss")]
    public async Task<IActionResult> DismissBanner(string month, CancellationToken ct)
    {
        await service.DismissBannerAsync(month, ct);
        return NoContent();
    }
}
