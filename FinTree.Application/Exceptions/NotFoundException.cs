namespace FinTree.Application.Exceptions;

public sealed class NotFoundException : Exception
{
    public NotFoundException(string entityName, Guid id)
        : base($"Сущность {entityName} с ID='{id}' не найдена.")
    {
    }

    public NotFoundException(string entityName, string key)
        : base($"Сущность {entityName} с ключом '{key}' не найдена.")
    {
    }

    public NotFoundException(string message)
        : base(message)
    {
    }
}
