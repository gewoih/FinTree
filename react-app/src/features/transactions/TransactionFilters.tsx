import { Search } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useViewport } from '@/hooks/useViewport';
import type { AccountDto, TransactionCategoryDto } from '@/types';
import { UNCATEGORIZED_NAME, UNCATEGORIZED_SELECT_VALUE } from '@/constants/uncategorized';
import { DateRangePopoverField } from './DateRangePopoverField';
import type { TransactionFiltersValue } from './transactionModels';
import {
  countActiveTransactionFilters,
  getTodayDateValue,
  hasActiveTransactionFilters,
} from './transactionUtils';

const ALL_VALUE = '__all__';

interface TransactionFiltersProps {
  value: TransactionFiltersValue;
  accounts: AccountDto[];
  categories: TransactionCategoryDto[];
  onChange: (filters: Partial<TransactionFiltersValue>) => void;
  onClear: () => void;
}

function FiltersContent({
  value,
  accounts,
  categories,
  onChange,
  onClear,
}: TransactionFiltersProps) {
  const hasFilters = hasActiveTransactionFilters(value);
  const incomeCategories = categories.filter((item) => item.type === 'Income');
  const expenseCategories = categories.filter((item) => item.type === 'Expense');

  const handleDateRangeChange = (nextFrom?: string, nextTo?: string) => {
    let dateFrom = nextFrom;
    let dateTo = nextTo;

    if (dateFrom && dateTo && dateTo < dateFrom) {
      [dateFrom, dateTo] = [dateTo, dateFrom];
    }

    onChange({ dateFrom, dateTo, page: 1 });
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_repeat(2,minmax(0,1fr))_auto_auto]">
      <div className="space-y-1.5">
        <div className="text-sm font-semibold text-muted-foreground">Поиск</div>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={value.search ?? ''}
            onChange={(event) =>
              onChange({
                search: event.target.value || undefined,
                page: 1,
              })
            }
            name="transactions-search"
            autoComplete="off"
            aria-label="Поиск по транзакциям"
            placeholder="Название или комментарий…"
            className="h-11 rounded-xl pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-sm font-semibold text-muted-foreground">Период</div>
        <DateRangePopoverField
          label="Период"
          from={value.dateFrom}
          to={value.dateTo}
          max={getTodayDateValue()}
          placeholder="Выберите период…"
          triggerAriaLabel="Период"
          onChange={({ from, to }) => handleDateRangeChange(from, to)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="text-sm font-semibold text-muted-foreground">Категория</div>
        <Select
          value={value.uncategorized ? UNCATEGORIZED_SELECT_VALUE : (value.categoryId ?? ALL_VALUE)}
          onValueChange={(nextValue) => {
            if (nextValue === UNCATEGORIZED_SELECT_VALUE) {
              onChange({ categoryId: undefined, uncategorized: true, page: 1 });
            } else {
              onChange({ categoryId: nextValue === ALL_VALUE ? undefined : nextValue, uncategorized: undefined, page: 1 });
            }
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-xl" aria-label="Фильтр по категории">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Все категории</SelectItem>
            <SelectItem value={UNCATEGORIZED_SELECT_VALUE}>{UNCATEGORIZED_NAME}</SelectItem>
            {incomeCategories.length > 0 ? (
              <SelectGroup>
                <SelectLabel>Доходы</SelectLabel>
                {incomeCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
            {expenseCategories.length > 0 ? (
              <SelectGroup>
                <SelectLabel>Расходы</SelectLabel>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="text-sm font-semibold text-muted-foreground">Счёт</div>
        <Select
          value={value.accountId ?? ALL_VALUE}
          onValueChange={(nextValue) =>
            onChange({
              accountId: nextValue === ALL_VALUE ? undefined : nextValue,
              page: 1,
            })
          }
        >
          <SelectTrigger className="h-11 w-full rounded-xl" aria-label="Фильтр по счёту">
            <SelectValue placeholder="Все счета" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Все счета</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="text-sm font-semibold text-muted-foreground">Тип</div>
        <Button
          type="button"
          variant={value.isMandatory === false ? 'default' : 'outline'}
          className="h-11 w-full rounded-xl"
          onClick={() =>
            onChange({
              isMandatory: value.isMandatory === false ? undefined : false,
              page: 1,
            })
          }
        >
          Необязательные
        </Button>
      </div>

      {hasFilters ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] self-end rounded-xl"
          onClick={onClear}
        >
          Сбросить
        </Button>
      ) : null}
    </div>
  );
}

export function TransactionFilters(props: TransactionFiltersProps) {
  const { isMobile } = useViewport();
  const activeFilterCount = countActiveTransactionFilters(props.value);

  if (isMobile) {
    return (
      <Accordion type="single" collapsible className="mx-auto w-full max-w-[960px]">
        <AccordionItem value="filters">
          <AccordionTrigger aria-label="Фильтры транзакций">
            <span className="flex items-center gap-2">
              <span>Фильтры</span>
              {activeFilterCount > 0 ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/30 bg-primary/10 text-primary"
                >
                  {activeFilterCount}
                </Badge>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <FiltersContent {...props} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[960px] rounded-xl border border-border bg-card/80 p-4 shadow-[var(--ft-shadow-sm)]">
      <FiltersContent {...props} />
    </div>
  );
}
