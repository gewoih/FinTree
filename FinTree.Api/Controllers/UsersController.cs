using FinTree.Application.Accounts;
using FinTree.Application.Identity;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UsersController(AccountsService accountsService, UserService userService) : ControllerBase
{
    [HttpGet("accounts")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var accounts = await accountsService.GetAccounts(ct);
        return Ok(accounts);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetUserCategories(CancellationToken ct)
    {
        var categories = await userService.GetUserCategoriesAsync(ct);
        return Ok(categories);
    }

    [HttpPatch("main-account")]
    public async Task<IActionResult> UpdateMainAccount([FromBody] Guid accountId, CancellationToken ct)
    {
        await userService.MarkAsMainAsync(accountId, ct);
        return Ok();
    }

    [HttpPatch("base-currency")]
    public async Task<IActionResult> UpdateBaseCurrency([FromBody] string currencyCode, CancellationToken ct)
    {
        await userService.UpdateBaseCurrency(currencyCode, ct);
        return Ok();
    }
}