using FinTree.Application.Accounts;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UsersController(AccountsService accountsService) : ControllerBase
{
    [HttpPatch("main-account")]
    public async Task<IActionResult> UpdateMainAccount([FromBody] Guid newAccountId, CancellationToken ct)
    {
        await accountsService.MarkAsMainAsync(newAccountId, ct);
        return Ok();
    }
}