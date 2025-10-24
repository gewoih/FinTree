using FinTree.Application.Dto;
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
}