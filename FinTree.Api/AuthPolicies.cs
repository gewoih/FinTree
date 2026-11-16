namespace FinTree.Api;

public static class AuthPolicies
{
    public const string OwnerOnly = "OwnerOnly";
    public const string PersonalAccessTokenOnly = "PersonalAccessTokenOnly";
    public const string SelfNotifyRateLimit = "self-notify";
}
