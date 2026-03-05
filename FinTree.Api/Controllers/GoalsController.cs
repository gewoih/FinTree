using FinTree.Application.Goals.Dto;
using FinTree.Application.Goals.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public sealed class GoalsController(GoalSimulationService simulationService) : ControllerBase
{
    [HttpGet("simulation-defaults")]
    public async Task<IActionResult> GetSimulationDefaults(CancellationToken ct)
    {
        var result = await simulationService.GetDefaultParametersAsync(ct);
        return Ok(result);
    }

    [HttpPost("simulate")]
    public async Task<IActionResult> Simulate([FromBody] GoalSimulationRequestDto dto, CancellationToken ct)
    {
        var result = await simulationService.SimulateAsync(dto, ct);
        return Ok(result);
    }
}
