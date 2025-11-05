using FinTree.Domain.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class CurrenciesController : ControllerBase
{
    [HttpGet]
    public IActionResult GetCurrencies()
    {
        var currencies = Currency.All;
        return Ok(currencies);
    }
}