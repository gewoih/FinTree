namespace FinTree.Application.Identity;

public interface ICurrentUser
{
    public Guid Id { get; }
}