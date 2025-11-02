using FinTree.Application.Transactions;
using FinTree.Application.Transactions.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class TransactionController(TransactionsService transactionsService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Post([FromBody] CreateTransaction command, CancellationToken ct)
    {
        var transactionId = await transactionsService.CreateAsync(command, ct);
        return Ok(transactionId);
    }

    [HttpPatch]
    public async Task<IActionResult> Update([FromBody] UpdateTransaction command, CancellationToken ct)
    {
        await transactionsService.UpdateAsync(command, ct);
        return Ok();
    }

    [HttpPatch("category")]
    public async Task<IActionResult> Patch([FromBody] AssignCategory command, CancellationToken ct)
    {
        await transactionsService.AssignCategoryAsync(command, ct);
        return Ok();
    }
}