using FinTree.Application.Transactions;
using FinTree.Application.Transactions.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class TransactionCategoryController(TransactionCategoryService transactionCategoryService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Post([FromBody] CreateTransactionCategory command, CancellationToken ct)
    {
        var categoryId = await transactionCategoryService.CreateCategoryAsync(command, ct);
        return Ok(categoryId);
    }

    [HttpPatch]
    public async Task<IActionResult> Patch([FromBody] UpdateTransactionCategory command, CancellationToken ct)
    {
        await transactionCategoryService.UpdateTransactionCategoryAsync(command, ct);
        return Ok();
    }

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] Guid id, CancellationToken ct)
    {
        await transactionCategoryService.DeleteCategoryAsync(id, ct);
        return Ok();
    }
}