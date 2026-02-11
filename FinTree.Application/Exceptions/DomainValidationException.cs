namespace FinTree.Application.Exceptions;

public sealed class DomainValidationException(
    string message,
    string code = "validation_error",
    object? details = null)
    : Exception(message)
{
    public string Code { get; } = code;
    public object? Details { get; } = details;
}
