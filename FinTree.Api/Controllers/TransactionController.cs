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
    [HttpGet]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] Guid? accountId,
        [FromQuery] Guid? categoryId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? search,
        [FromQuery] bool? isMandatory,
        [FromQuery] int page = 1,
        [FromQuery] int size = 50,
        CancellationToken ct = default)
    {
        var filter = new TxFilter(accountId, categoryId, from, to, search, isMandatory, page, size);
        var transactions = await transactionsService.GetTransactionsAsync(filter, ct);
        return Ok(transactions);
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] CreateTransaction command, CancellationToken ct)
    {
        var transactionId = await transactionsService.CreateAsync(command, ct);
        return StatusCode(201, transactionId);
    }

    [HttpPatch]
    public async Task<IActionResult> Update([FromBody] UpdateTransaction command, CancellationToken ct)
    {
        await transactionsService.UpdateAsync(command, ct);
        return NoContent();
    }

    [HttpPatch("category")]
    public async Task<IActionResult> Patch([FromBody] AssignCategory command, CancellationToken ct)
    {
        await transactionsService.AssignCategoryAsync(command, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await transactionsService.DeleteAsync(id, ct);
        return NoContent();
    }

}
