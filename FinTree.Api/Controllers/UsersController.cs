using FinTree.Application.Accounts;
using FinTree.Application.Transactions;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UsersController(AccountsService accountsService, TransactionsService transactionsService) : ControllerBase
{
    [HttpGet("accounts")]
    public async Task<IActionResult> Get([FromQuery] Guid userId, CancellationToken ct)
    {
        var accounts = await accountsService.GetAccounts(userId, ct);
        return Ok(accounts);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetUserCategories([FromQuery] Guid userId, CancellationToken ct)
    {
        var categories = await transactionsService.GetUserCategoriesAsync(userId, ct);
        return Ok(categories);
    }

    [HttpPatch("main-account")]
    public async Task<IActionResult> UpdateMainAccount([FromBody] UpdateMainAccount command, CancellationToken ct)
    {
        await accountsService.MarkAsMainAsync(command, ct);
        return Ok();
    }
}