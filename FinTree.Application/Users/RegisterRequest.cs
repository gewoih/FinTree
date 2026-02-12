using System.ComponentModel.DataAnnotations;

namespace FinTree.Application.Users;

public readonly record struct RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);
