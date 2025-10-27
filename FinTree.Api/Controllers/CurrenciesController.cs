using FinTree.Application.Currencies;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CurrenciesController(CurrenciesService currenciesService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCurrenciesAsync(CancellationToken ct)
    {
        var currencies = await currenciesService.GetCurrenciesAsync(ct);
        return Ok(currencies);
    }
}