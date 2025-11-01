using FinTree.Application.Accounts;
using FinTree.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class UsersController(AccountsService accountsService, UserService userService) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> GetMeAsync(CancellationToken ct)
    {
        var userData = await userService.GetCurrentUserDataAsync(ct);
        return Ok(userData);
    }
    
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

    [HttpPatch("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileRequest request, CancellationToken ct)
    {
        var updatedUser = await userService.UpdateProfileAsync(request, ct);
        return Ok(updatedUser);
    }
}
