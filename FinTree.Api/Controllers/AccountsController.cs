using FinTree.Application.Accounts;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AccountsController(AccountsService accountsService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] CreateAccount command, CancellationToken ct = default)
    {
        var accountId = await accountsService.CreateAsync(command, ct);
        return Ok(accountId);
    }
}