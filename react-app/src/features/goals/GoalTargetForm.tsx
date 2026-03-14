import { FormField } from '@/components/common/FormField';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatEditableNumber } from '@/utils/format';

interface GoalTargetFormProps {
  targetAmount: number | null;
  currencyCode: string;
  error: string | null;
  onChange: (value: number | null) => void;
}

export function GoalTargetForm({
  targetAmount,
  currencyCode,
  error,
  onChange,
}: GoalTargetFormProps) {
  return (
    <Card className="max-w-xl rounded-2xl border border-border/80 bg-card/95 shadow-[var(--ft-shadow-sm)]">
      <CardContent className="pt-6">
        <FormField
          label={`Целевая сумма (${currencyCode})`}
          required
          error={error}
          hint="Сумма, к которой вы хотите прийти с учётом текущих доходов, расходов и доходности."
        >
          <Input
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            className="h-11 rounded-xl"
            value={formatEditableNumber(targetAmount, 0)}
            onChange={(event) => {
              const raw = event.target.value.trim();
              onChange(raw.length === 0 ? null : Number(raw));
            }}
          />
        </FormField>
      </CardContent>
    </Card>
  );
}
