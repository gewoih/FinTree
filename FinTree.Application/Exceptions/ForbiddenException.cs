namespace FinTree.Application.Exceptions;

public sealed class ForbiddenException(
    string message = "Доступ запрещен",
    string code = "forbidden",
    object? details = null)
    : Exception(message)
{
    public string Code { get; } = code;
    public object? Details { get; } = details;
}
