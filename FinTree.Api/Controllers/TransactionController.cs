using FinTree.Application.Transactions;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

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

    [HttpPost("category")]
    public async Task<IActionResult> Post([FromBody] CreateTransactionCategory command, CancellationToken ct)
    {
        var categoryId = await transactionsService.CreateCategoryAsync(command, ct);
        return Ok(categoryId);
    }

    [HttpPatch("category")]
    public async Task<IActionResult> Patch([FromBody] AssignCategory command, CancellationToken ct)
    {
        await transactionsService.AssignCategoryAsync(command, ct);
        return Ok();
    }
}