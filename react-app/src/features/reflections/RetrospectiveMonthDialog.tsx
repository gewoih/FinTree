import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ReflectionMonthOption } from './reflectionModels';

interface RetrospectiveMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ReflectionMonthOption[];
  loading: boolean;
  fetchError: string | null;
  submitError: string | null;
  selectedMonth: string;
  onSelectedMonthChange: (month: string) => void;
  onConfirm: () => void;
}

export function RetrospectiveMonthDialog({
  open,
  onOpenChange,
  options,
  loading,
  fetchError,
  submitError,
  selectedMonth,
  onSelectedMonthChange,
  onConfirm,
}: RetrospectiveMonthDialogProps) {
  const selectedOption = options.find((option) => option.value === selectedMonth) ?? null;
  const hasOptions = options.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-border/80 bg-[color-mix(in_srgb,var(--ft-surface-raised)_92%,transparent)] p-0 shadow-[var(--ft-shadow-xl)]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Выберите месяц</DialogTitle>
          <DialogDescription>
            Откройте месяц, по которому хотите подвести финансовые итоги. Если запись уже существует, вы перейдете к редактированию.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-2">
          {loading ? (
            <div className="rounded-xl border border-border/70 bg-background/30 px-4 py-4 text-sm text-muted-foreground">
              Загружаем доступные месяцы…
            </div>
          ) : fetchError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {fetchError}
            </div>
          ) : hasOptions ? (
            <>
              <Select value={selectedMonth} onValueChange={onSelectedMonthChange}>
                <SelectTrigger className="h-12 w-full rounded-xl">
                  <SelectValue placeholder="Выберите месяц" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.hasRetrospective
                        ? `${option.label} · уже заполнено`
                        : option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedOption?.hasRetrospective ? (
                <p className="rounded-xl border border-border/70 bg-background/25 px-4 py-3 text-sm text-muted-foreground">
                  Для этого месяца запись уже есть. После перехода вы откроете ее на редактирование.
                </p>
              ) : null}
            </>
          ) : (
            <div className="rounded-xl border border-border/70 bg-background/25 px-4 py-4 text-sm text-muted-foreground">
              Пока нет доступных месяцев для новой рефлексии.
            </div>
          )}

          {submitError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-2 border-t border-border/70 bg-background/20 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={onConfirm} disabled={!hasOptions || loading}>
            Открыть месяц
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
