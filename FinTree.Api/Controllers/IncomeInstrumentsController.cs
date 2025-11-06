using FinTree.Application.IncomeInstruments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/income-instruments")]
public sealed class IncomeInstrumentsController(IncomeInstrumentsService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAsync(CancellationToken ct)
    {
        var items = await service.GetAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] CreateIncomeInstrument command, CancellationToken ct)
    {
        var id = await service.CreateAsync(command, ct);
        return Ok(id);
    }
}
