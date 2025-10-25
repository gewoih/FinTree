using FinTree.Application.Accounts;
using FinTree.Application.Users;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UsersController(AccountsService accountsService, UserService userService) : ControllerBase
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
        var categories = await userService.GetUserCategoriesAsync(userId, ct);
        return Ok(categories);
    }

    [HttpPatch("main-account")]
    public async Task<IActionResult> UpdateMainAccount([FromBody] UpdateMainAccount command, CancellationToken ct)
    {
        await userService.MarkAsMainAsync(command, ct);
        return Ok();
    }

    [HttpPatch("base-currency")]
    public async Task<IActionResult> UpdateBaseCurrency(Guid userId, Guid currencyId, CancellationToken ct)
    {
        await userService.UpdateBaseCurrency(userId, currencyId, ct);
        return Ok();
    }
}