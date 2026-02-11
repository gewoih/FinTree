using System.ComponentModel.DataAnnotations;

namespace FinTree.Domain.Identity;

public sealed class RefreshToken
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;
    [MaxLength(64)] public string TokenHash { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime? RevokedAt { get; private set; }
    public Guid? ReplacedByTokenId { get; private set; }

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTime.UtcNow;

    private RefreshToken()
    {
    }

    public RefreshToken(Guid userId, string tokenHash, DateTime createdAt, DateTime expiresAt)
    {
        ArgumentOutOfRangeException.ThrowIfEqual(userId, Guid.Empty);
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenHash);
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(expiresAt, createdAt);

        Id = Guid.NewGuid();
        UserId = userId;
        TokenHash = tokenHash.Trim();
        CreatedAt = createdAt;
        ExpiresAt = expiresAt;
    }

    public void Revoke(DateTime revokedAt, Guid? replacedByTokenId = null)
    {
        if (RevokedAt is not null)
            return;

        RevokedAt = revokedAt;
        ReplacedByTokenId = replacedByTokenId;
    }
}
