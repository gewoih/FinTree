using FinTree.Application.Accounts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class AccountsController(AccountsService accountsService) : ControllerBase
{
    public sealed record CreateBalanceAdjustmentRequest(decimal Amount);

    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] CreateAccount command, CancellationToken ct = default)
    {
        var accountId = await accountsService.CreateAsync(command, ct);
        return Ok(accountId);
    }

    [HttpGet("{accountId:guid}/balance-adjustments")]
    public async Task<IActionResult> GetBalanceAdjustments(Guid accountId, CancellationToken ct = default)
    {
        var adjustments = await accountsService.GetBalanceAdjustmentsAsync(accountId, ct);
        return Ok(adjustments);
    }

    [HttpPost("{accountId:guid}/balance-adjustments")]
    public async Task<IActionResult> CreateBalanceAdjustment(Guid accountId,
        [FromBody] CreateBalanceAdjustmentRequest request,
        CancellationToken ct = default)
    {
        var adjustmentId = await accountsService.CreateBalanceAdjustmentAsync(accountId, request.Amount, ct);
        return Ok(adjustmentId);
    }
}
