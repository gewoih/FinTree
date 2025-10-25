namespace FinTree.Application.Exceptions;

public sealed class NotFoundException(string entityName, Guid id)
    : Exception($"Сущность {entityName} с ID='{id}' не найдена.");