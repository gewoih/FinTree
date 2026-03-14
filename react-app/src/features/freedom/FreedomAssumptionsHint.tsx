import { Card, CardContent } from '@/components/ui/card';

export function FreedomAssumptionsHint() {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">Как читать результат</div>
          <p className="text-sm text-muted-foreground">
            Калькулятор использует капитал, ежемесячные расходы, безопасную ставку изъятия и личную инфляцию.
            Календарь ниже показывает условное распределение “свободных дней” по году и не является точным
            прогнозом по конкретным датам.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
