using FinTree.Application.FreedomCalculator.Dto;
using FinTree.Application.FreedomCalculator.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/freedom-calculator")]
[ApiController]
public sealed class FreedomCalculatorController(FreedomCalculatorService calculatorService) : ControllerBase
{
    [HttpGet("defaults")]
    public async Task<IActionResult> GetDefaults(CancellationToken ct)
    {
        var result = await calculatorService.GetDefaultsAsync(ct);
        return Ok(result);
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> Calculate([FromBody] FreedomCalculatorRequestDto dto, CancellationToken ct)
    {
        var result = await FreedomCalculatorService.CalculateAsync(dto, ct);
        return Ok(result);
    }
}
