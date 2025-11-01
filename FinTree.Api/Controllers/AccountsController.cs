using FinTree.Application.Accounts;
using FinTree.Application.Transactions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class AccountsController(AccountsService accountsService, TransactionsService transactionsService) : ControllerBase
{
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(Guid? accountId, CancellationToken ct)
    {
        var transactions = await transactionsService.GetTransactionsAsync(accountId, null, ct);
        return Ok(transactions.Items);
    }
    
    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] CreateAccount command, CancellationToken ct = default)
    {
        var accountId = await accountsService.CreateAsync(command, ct);
        return Ok(accountId);
    }
}