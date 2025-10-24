namespace FinTree.Application.Exceptions;

public sealed class NotFoundException(string name, Guid id) : Exception($"Сущность {name} с ID='{id}' не найдена.");