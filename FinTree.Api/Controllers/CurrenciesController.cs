using FinTree.Domain.ValueObjects;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CurrenciesController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCurrenciesAsync(CancellationToken ct)
    {
        var currencies = Currency.All;
        return Ok(currencies);
    }
}