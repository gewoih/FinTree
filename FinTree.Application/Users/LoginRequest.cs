using System.ComponentModel.DataAnnotations;

namespace FinTree.Application.Users;

public readonly record struct LoginRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);
