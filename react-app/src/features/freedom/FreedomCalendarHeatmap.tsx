import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildFreedomCalendarMonths } from './freedomUtils';

interface FreedomCalendarHeatmapProps {
  freeDaysPerYear: number;
}

export function FreedomCalendarHeatmap({
  freeDaysPerYear,
}: FreedomCalendarHeatmapProps) {
  const calendarMonths = buildFreedomCalendarMonths(freeDaysPerYear);
  const year = new Date().getFullYear();

  return (
    <Card className="h-full rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          Календарь свободы
        </CardTitle>
        <CardDescription>
          Показывает, на сколько дней в году текущего капитала уже хватает при выбранных параметрах.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-6 pt-6">
        <div
          className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          role="img"
          aria-label={`Календарь свободы: ${freeDaysPerYear} свободных дней в ${year} году.`}
        >
          {calendarMonths.map((month) => (
            <div key={month.name} className="space-y-2">
              <div className="text-center text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {month.name}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {month.cells.map((cell) => (
                  <div
                    key={`${month.name}-${cell.day}`}
                    className="aspect-square rounded-[6px]"
                    style={{
                      backgroundColor:
                        cell.type === 'free'
                          ? 'var(--ft-success-500)'
                          : 'color-mix(in srgb, var(--ft-border-default) 82%, transparent)',
                      opacity: cell.type === 'free' ? 0.9 : 1,
                    }}
                    title={String(cell.day)}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-[6px]"
              style={{ backgroundColor: 'var(--ft-success-500)', opacity: 0.9 }}
              aria-hidden="true"
            />
            Дни свободы
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-[6px]"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--ft-border-default) 82%, transparent)',
              }}
              aria-hidden="true"
            />
            Нужно работать
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
