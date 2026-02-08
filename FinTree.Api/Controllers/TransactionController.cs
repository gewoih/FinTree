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
    public async Task<IActionResult> GetTransactions(Guid? accountId, CancellationToken ct)
    {
        var transactions = await transactionsService.GetTransactionsAsync(accountId, ct);
        return Ok(transactions);
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken ct)
    {
        var (content, fileName) = await transactionsService.ExportAsync(ct);
        return File(content, "text/plain; charset=utf-8", fileName);
    }
    
    [HttpPost]
    public async Task<IActionResult> Post([FromBody] CreateTransaction command, CancellationToken ct)
    {
        var transactionId = await transactionsService.CreateAsync(command, ct);
        return Ok(transactionId);
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> CreateTransfer([FromBody] CreateTransfer command, CancellationToken ct)
    {
        var transferId = await transactionsService.CreateTransferAsync(command, ct);
        return Ok(transferId);
    }

    [HttpPatch("transfer")]
    public async Task<IActionResult> UpdateTransfer([FromBody] UpdateTransfer command, CancellationToken ct)
    {
        await transactionsService.UpdateTransferAsync(command, ct);
        return Ok();
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

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] Guid id, CancellationToken ct)
    {
        await transactionsService.DeleteAsync(id, ct);
        return Ok();
    }

    [HttpDelete("transfer")]
    public async Task<IActionResult> DeleteTransfer([FromQuery] Guid transferId, CancellationToken ct)
    {
        await transactionsService.DeleteTransferAsync(transferId, ct);
        return Ok();
    }
}
