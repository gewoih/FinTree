using FinTree.Application.Goals.Dto;
using FinTree.Application.Goals.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinTree.Api.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public sealed class GoalsController(GoalService goalService, GoalSimulationService simulationService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var goals = await goalService.GetAllAsync(ct);
        return Ok(goals);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var goal = await goalService.GetByIdAsync(id, ct);
        return Ok(goal);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGoalDto dto, CancellationToken ct)
    {
        var goal = await goalService.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = goal.Id }, goal);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateGoalDto dto, CancellationToken ct)
    {
        var goal = await goalService.UpdateAsync(id, dto, ct);
        return Ok(goal);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await goalService.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/simulate")]
    public async Task<IActionResult> Simulate(Guid id, [FromBody] GoalSimulationRequestDto dto, CancellationToken ct)
    {
        var goal = await simulationService.LoadGoalForSimulationAsync(id, ct);
        var result = await simulationService.SimulateAsync(goal, dto, ct);
        return Ok(result);
    }
}
