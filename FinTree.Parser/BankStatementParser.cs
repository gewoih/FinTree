using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace FinTree.Parser;

public enum TxnKind
{
    Expense,
    Income,
    Transfer,
    InvestmentTopUp,
    Refund,
    Fee,
    Unknown
}

public sealed class Expense
{
    public DateOnly OperationDate { get; init; }
    public decimal Amount { get; init; } // всегда > 0 по модулю
    public TxnKind Kind { get; init; }
    public string Category { get; init; } = "";
    public string? Merchant { get; init; }
}

public static class BankStatementParser
{
    static readonly (string[] keys, string category)[] CategoryRules =
    {
        (["SPAR", "PYATEROCHKA", "PEREKRESTOK", "DIXY", "SAMOKAT", "MAGNIT", "BAKHETLE", "EUROSPAR", "a-moloko", "Pivarych", "TORTIK"],
            "Продукты"),

        (["APTEKA", "GORZDRAV", "PLATNYJ STACIONAR", "DDX"], "Здоровье"),

        ([
            "TRANSPORT", "SITICARD", "AEROEXPRESS", "TRANSKART", "OAO Moskovsko-Tverskay"
        ], "Транспорт"),

        ([
            "TEMP VOZDUKH", "TEMP", "COFFEE", "SKURATOV", "SURF COFFEE", "SMORODINA", "BRASSERIE", "SYROVARNYA", "REST",
            "RESTAURANT", "TATAR", "SAULYK", "BIG BUTCHER", "BARELLI", "22 SANTIMETRA", "SHAURMA", "KOFEYNYA", "TUBATAY"
        ], "Кафе/Рестораны"),

        (["АЭРОФЛОТ", "Авиакомпания Победа"], "Путешествия"),
        (["Суточно.ру", "Хостел"], "Жилье"),
        (["Lamoda", "STOLICHNYJ GARDEROB", ], "Одежда"),
        (["Barbershop"], "Красота"),
        (["REG.RU", "Рег.ру", "TIMEWEB", "Getcontact"], "Подписки/IT"),
        (["FOND ATOM_CP", "MUZEY"], "Развлечения"),
        (["NETMONET"], "Чаевые")
    };


    private static readonly Regex LineRx = new(
        @"^(?<op>\d{2}\.\d{2}\.\d{2}(?:\s+\d{2}:\d{2})?)\s+" +
        @"(?<proc>\d{2}\.\d{2}\.\d{2})\s+" +
        @"(?<amt1>[+\-]?\s*[\d\s]+(?:[.,]\d{1,2})?)\s*₽\s+" +
        @"(?<amt2>[+\-]?\s*[\d\s]+(?:[.,]\d{1,2})?)\s*₽" +
        @"(?<desc>.+)$",
        RegexOptions.Compiled);

    public static IReadOnlyList<Expense> Parse(string pdfPath)
    {
        var culture = CultureInfo.GetCultureInfo("ru-RU");
        var text = ExtractText(pdfPath);

        // построчная обработка
        var lines = text.Split('\n')
            .Select(s => s.Replace('\r', ' ').Replace("  ", " ").Trim())
            .Where(s => s.Length > 0)
            .ToList();

        var result = new List<Expense>();

        foreach (var line in lines)
        {
            var m = LineRx.Match(line);
            if (!m.Success) continue;

            var dateStr = m.Groups["op"].Value;
            // бывает без времени — DateTime.Parse под ru-RU справится
            if (!DateTime.TryParse(dateStr, culture, DateTimeStyles.AssumeLocal, out var opDate))
                continue;

            var desc = m.Groups["desc"].Value.Trim();
            var (absAmount, signed) = ParseAmountPair(m.Groups["amt2"].Value);

            var kind = Classify(desc, signed);
            if (kind == TxnKind.InvestmentTopUp || kind == TxnKind.Refund)
                continue;

            var category = AssignCategory(desc, kind);

            result.Add(new Expense
            {
                OperationDate = DateOnly.FromDateTime(opDate),
                Amount = absAmount, // модуль
                Kind = kind,
                Category = category,
                Merchant = desc,
            });
        }

        return result;
    }

    private static string ExtractText(string pdfPath)
    {
        var sb = new StringBuilder();
        using var doc = PdfDocument.Open(pdfPath);
        foreach (var page in doc.GetPages())
        {
            var txt = ContentOrderTextExtractor.GetText(page);
            sb.AppendLine(txt);
        }

        return sb.ToString();
    }

    private static (decimal absAmount, int signed) ParseAmountPair(string a2)
    {
        var v2 = ParseDec(a2);
        var sign = v2 >= 0 ? +1 : -1;
        return (Math.Abs(v2), sign);

        // В выписке часто дублируется сумма двумя колонками — берём вторую.
        decimal ParseDec(string s)
        {
            var norm = s.Replace(" ", "").Replace('\u00A0'.ToString(), "").Replace(",", ".");
            return decimal.Parse(norm, CultureInfo.InvariantCulture);
        }
    }

    private static TxnKind Classify(string desc, int signed)
    {
        var d = desc.ToUpperInvariant();

        if (d.Contains("КЭШБЭК")) 
            return TxnKind.Income;
        
        if (d.Contains("ВОЗВРАТ ПОКУПКИ")) 
            return TxnKind.Refund;

        if (d.Contains("ПОПОЛНЕНИЕ БРОКЕРСКОГО СЧЕТА")) 
            return TxnKind.InvestmentTopUp;
        
        if (d.Contains("ВНУТРЕННИЙ ПЕРЕВОД") || d.Contains("ВНУТРИБАНКОВСКИЙ ПЕРЕВОД") || d.Contains("ВНЕШНИЙ ПЕРЕВОД"))
            return TxnKind.Transfer;

        if (d.Contains("ПЛАТА ЗА СЕРВИС") || d.Contains("КОМИССИЯ"))
            return signed < 0 ? TxnKind.Expense : TxnKind.Fee;

        if (d.StartsWith("ОПЛАТА"))
            return TxnKind.Expense;

        return signed < 0 ? TxnKind.Expense : TxnKind.Income;
    }

    private static string AssignCategory(string desc, TxnKind kind)
    {
        if (kind != TxnKind.Expense)
        {
            return kind switch
            {
                TxnKind.Income => "Доходы",
                TxnKind.Refund => "Возврат",
                TxnKind.Transfer => "Переводы",
                TxnKind.InvestmentTopUp => "Инвестиции (трансфер)",
                TxnKind.Fee => "Комиссии/сервис",
                _ => "Прочее"
            };
        }

        var hay = desc.ToUpperInvariant();
        foreach (var (keys, cat) in CategoryRules)
        {
            var categoryKeys = keys.Select(k => k.ToUpperInvariant());
            if (categoryKeys.Any(k => hay.Contains(k)))
                return cat;
        }

        if (desc.Contains("кофе", StringComparison.OrdinalIgnoreCase)) return "Кафе/Рестораны";
        if (desc.Contains("аптека", StringComparison.OrdinalIgnoreCase)) return "Аптека";

        return "Прочее";
    }
}