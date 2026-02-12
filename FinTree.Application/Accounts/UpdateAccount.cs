using System.ComponentModel.DataAnnotations;

namespace FinTree.Application.Accounts;

public readonly record struct UpdateAccount([property: Required, StringLength(50)] string Name);