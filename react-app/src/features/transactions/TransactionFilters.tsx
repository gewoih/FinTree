import { Search } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { DatePopoverField } from './DatePopoverField';
import type { TransactionFiltersValue } from './transactionModels';
import { getTodayDateValue, hasActiveTransactionFilters } from './transactionUtils';

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

  const handleDateChange = (
    field: 'dateFrom' | 'dateTo',
    nextValue?: string
  ) => {
    const currentFrom = value.dateFrom;
    const currentTo = value.dateTo;

    if (field === 'dateFrom') {
      if (nextValue && currentTo && currentTo < nextValue) {
        onChange({ dateFrom: currentTo, dateTo: nextValue, page: 1 });
        return;
      }

      onChange({ dateFrom: nextValue, page: 1 });
      return;
    }

    if (nextValue && currentFrom && nextValue < currentFrom) {
      onChange({ dateFrom: nextValue, dateTo: currentFrom, page: 1 });
      return;
    }

    onChange({ dateTo: nextValue, page: 1 });
  };

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
      <DatePopoverField
        label="От"
        value={value.dateFrom}
        max={getTodayDateValue()}
        placeholder="Дата от"
        onChange={(nextValue) => handleDateChange('dateFrom', nextValue)}
      />

      <DatePopoverField
        label="До"
        value={value.dateTo}
        max={getTodayDateValue()}
        placeholder="Дата до"
        onChange={(nextValue) => handleDateChange('dateTo', nextValue)}
      />

      <Select
        value={value.categoryId ?? ALL_VALUE}
        onValueChange={(nextValue) =>
          onChange({
            categoryId: nextValue === ALL_VALUE ? undefined : nextValue,
            page: 1,
          })
        }
      >
        <SelectTrigger className="h-11 w-full rounded-xl">
          <SelectValue placeholder="Все категории" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Все категории</SelectItem>
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

      <Select
        value={value.accountId ?? ALL_VALUE}
        onValueChange={(nextValue) =>
          onChange({
            accountId: nextValue === ALL_VALUE ? undefined : nextValue,
            page: 1,
          })
        }
      >
        <SelectTrigger className="h-11 w-full rounded-xl">
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
          placeholder="Поиск"
          className="h-11 rounded-xl pl-9"
        />
      </div>

      {hasFilters ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] rounded-xl"
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

  if (isMobile) {
    return (
      <Accordion type="single" collapsible className="mx-auto w-full max-w-[960px]">
        <AccordionItem value="filters">
          <AccordionTrigger>Фильтры</AccordionTrigger>
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
