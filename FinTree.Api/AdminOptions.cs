namespace FinTree.Api;

public sealed class AdminOptions
{
    public string[] OwnerEmails { get; set; } = [];
    public string? OwnerEmailsCsv { get; set; }

    public string[] ResolveOwnerEmails()
    {
        var csvEmails = string.IsNullOrWhiteSpace(OwnerEmailsCsv)
            ? []
            : OwnerEmailsCsv
                .Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return OwnerEmails
            .Concat(csvEmails)
            .Where(email => !string.IsNullOrWhiteSpace(email))
            .Select(email => email.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }
}
