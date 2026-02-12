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
    public sealed record UpdateLiquidityRequest(bool IsLiquid);
    public sealed record UpdateAccountRequest(string Name);

    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] CreateAccount command, CancellationToken ct = default)
    {
        var accountId = await accountsService.CreateAsync(command, ct);
        return Ok(accountId);
    }

    [HttpGet("investments")]
    public async Task<IActionResult> GetInvestmentsOverview(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct = default)
    {
        var data = await accountsService.GetInvestmentsOverviewAsync(from, to, ct);
        return Ok(data);
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

    [HttpPatch("{accountId:guid}/liquidity")]
    public async Task<IActionResult> UpdateLiquidity(Guid accountId,
        [FromBody] UpdateLiquidityRequest request,
        CancellationToken ct = default)
    {
        await accountsService.UpdateLiquidityAsync(accountId, request.IsLiquid, ct);
        return Ok();
    }

    [HttpPatch("{accountId:guid}")]
    public async Task<IActionResult> UpdateAccount(Guid accountId,
        [FromBody] UpdateAccountRequest request,
        CancellationToken ct = default)
    {
        await accountsService.UpdateAsync(accountId, new UpdateAccount(request.Name), ct);
        return Ok();
    }

    [HttpPatch("{accountId:guid}/archive")]
    public async Task<IActionResult> ArchiveAccount(Guid accountId, CancellationToken ct = default)
    {
        await accountsService.ArchiveAsync(accountId, ct);
        return Ok();
    }

    [HttpPatch("{accountId:guid}/unarchive")]
    public async Task<IActionResult> UnarchiveAccount(Guid accountId, CancellationToken ct = default)
    {
        await accountsService.UnarchiveAsync(accountId, ct);
        return Ok();
    }

    [HttpDelete("{accountId:guid}")]
    public async Task<IActionResult> DeleteAccount(Guid accountId, CancellationToken ct = default)
    {
        await accountsService.DeleteAsync(accountId, ct);
        return Ok();
    }
}
