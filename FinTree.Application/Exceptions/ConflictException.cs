namespace FinTree.Application.Exceptions;

public sealed class ConflictException(
    string message,
    string code = "conflict",
    object? details = null)
    : Exception(message)
{
    public string Code { get; } = code;
    public object? Details { get; } = details;
}
