namespace FinTree.Application.Telegram;

/// <summary>
/// Настройки совета «сколько и куда отложить» в ответе бота после записи зарплаты (секция <c>SalaryAdvice</c>).
/// Все поля строковые: пустые переменные из compose не должны ронять биндинг. Любое пустое/неверное поле = функция выключена.
/// </summary>
public sealed class SalaryAdviceOptions
{
    /// <summary>Id пользователя, для которого включён совет.</summary>
    public string? UserId { get; set; }

    /// <summary>Доля зарплаты к откладыванию, число от 0 до 1 (например, 0.5), десятичная точка.</summary>
    public string? SaveRate { get; set; }

    /// <summary>Название категории дохода, которая считается зарплатой.</summary>
    public string? Category { get; set; }
}
