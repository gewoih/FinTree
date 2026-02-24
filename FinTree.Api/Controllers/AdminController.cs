using FinTree.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize(Policy = AuthPolicies.OwnerOnly)]
[Route("api/[controller]")]
[ApiController]
public class AdminController(AdminService adminService) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(CancellationToken ct)
    {
        var overview = await adminService.GetOverviewAsync(ct);
        return Ok(overview);
    }
}
