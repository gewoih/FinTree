using FinTree.Parser;

var expenses1 = BankStatementParser.Parse("Выписка 1.pdf");
var expenses2 = BankStatementParser.Parse("Выписка 2.pdf");
var expenses3 = BankStatementParser.Parse("Выписка 3.pdf");
var expenses = expenses1.Concat(expenses2).Concat(expenses3);

// только реальные траты:
var onlyExpenses = expenses.Where(e => e.Kind is TxnKind.Expense);

var byCategory = onlyExpenses
    .GroupBy(e => e.Category)
    .Select(g => new { Category = g.Key, Total = g.Sum(x => x.Amount), Count = g.Count() })
    .OrderByDescending(x => x.Total)
    .ToList();

Console.WriteLine($"Всего: {onlyExpenses.Sum(e => e.Amount)}");

// например, вывести:
foreach (var row in byCategory)
    Console.WriteLine($"{row.Category,-25} {row.Total,12:N2} ₽  ({row.Count} операций)");