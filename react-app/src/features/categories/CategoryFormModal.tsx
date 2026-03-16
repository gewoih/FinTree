import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';
import { getDefaultCategoryHexColor } from '@/utils/categoryPalette';
import {
  CATEGORY_TYPE,
  type Category,
  type CategoryType,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '@/types';
import {
  getCategoryIconLabel,
  getCategoryIconOptions,
  normalizeCategoryIconKey,
  renderCategoryIcon,
} from './categoryIcons';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Введите название категории').max(100, 'Максимум 100 символов'),
  categoryType: z.enum([CATEGORY_TYPE.Income, CATEGORY_TYPE.Expense]),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Используйте формат #RRGGBB'),
  icon: z.string().trim().min(1, 'Выберите иконку'),
  isMandatory: z.boolean(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormModalProps {
  open: boolean;
  category: Category | null;
  defaultType: CategoryType;
  readonly?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateCategoryPayload | UpdateCategoryPayload) => Promise<void>;
  onDelete: (category: Category) => Promise<void>;
}

const DEFAULT_COLOR = getDefaultCategoryHexColor();

function getDefaultValues(
  category: Category | null,
  defaultType: CategoryType,
): CategoryFormValues {
  if (category) {
    return {
      name: category.name,
      categoryType: category.type,
      color: category.color,
      icon: normalizeCategoryIconKey(category.icon),
      isMandatory: category.isMandatory ?? false,
    };
  }

  return {
    name: '',
    categoryType: defaultType,
    color: DEFAULT_COLOR,
    icon: 'tag',
    isMandatory: false,
  };
}

export function CategoryFormModal({
  open,
  category,
  defaultType,
  readonly = false,
  isSaving = false,
  isDeleting = false,
  onOpenChange,
  onSubmit,
  onDelete,
}: CategoryFormModalProps) {
  const isEditMode = category !== null;
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(category, defaultType),
  });

  const watchedType = useWatch({
    control: form.control,
    name: 'categoryType',
  }) ?? defaultType;
  const isExpenseCategory = watchedType === CATEGORY_TYPE.Expense;
  const iconOptions = getCategoryIconOptions(watchedType);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(getDefaultValues(category, defaultType));
  }, [category, defaultType, form, open]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    const currentIcon = form.getValues('icon');
    const isCurrentIconAvailable = iconOptions.some((option) => option.key === currentIcon);

    if (!isCurrentIconAvailable) {
      form.setValue('icon', iconOptions[0]?.key ?? 'tag', { shouldDirty: true });
    }
  }, [form, iconOptions, isEditMode]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (readonly) {
      return;
    }

    if (isEditMode && category) {
      await onSubmit({
        id: category.id,
        name: values.name.trim(),
        color: values.color,
        icon: values.icon,
        isMandatory: values.categoryType === CATEGORY_TYPE.Expense ? values.isMandatory : false,
      });
      return;
    }

    await onSubmit({
      categoryType: values.categoryType,
      name: values.name.trim(),
      color: values.color,
      icon: values.icon,
      isMandatory: values.categoryType === CATEGORY_TYPE.Expense ? values.isMandatory : false,
    });
  });

  const selectedIconKey = useWatch({
    control: form.control,
    name: 'icon',
  }) ?? 'tag';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Категория' : 'Новая категория'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Обновите параметры категории.'
              : 'Создайте категорию для более точной аналитики и удобной фильтрации.'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Название"
              required
              error={form.formState.errors.name?.message}
            >
              <Input
                autoFocus
                placeholder="Например, «Транспорт»"
                {...form.register('name')}
                disabled={readonly || isSaving || isDeleting}
              />
            </FormField>

            <FormField
              label="Тип"
              required
              error={form.formState.errors.categoryType?.message}
            >
              <Controller
                control={form.control}
                name="categoryType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readonly || isSaving || isDeleting || isEditMode}
                  >
                    <SelectTrigger className="h-11 w-full rounded-lg">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CATEGORY_TYPE.Expense}>Расходы</SelectItem>
                      <SelectItem value={CATEGORY_TYPE.Income}>Доходы</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <FormField
              label="Иконка"
              hint="Используется в списках, тегах и транзакциях."
            >
              <div className="space-y-3">
                <div
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-3"
                  aria-live="polite"
                >
                  <span
                    className="flex size-11 items-center justify-center rounded-lg border border-border bg-background/60"
                    aria-hidden="true"
                  >
                    {renderCategoryIcon(selectedIconKey, { className: 'size-5' })}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {getCategoryIconLabel(selectedIconKey)}
                    </p>
                    <p className="text-xs text-muted-foreground">Выбранная иконка категории</p>
                  </div>
                </div>

                <Controller
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <div
                      role="radiogroup"
                      aria-label="Выбор иконки категории"
                      className="grid grid-cols-4 gap-2 sm:grid-cols-5"
                    >
                      {iconOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = field.value === option.key;

                        return (
                          <button
                            key={option.key}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={option.label}
                            disabled={readonly || isSaving || isDeleting}
                            className={cn(
                              'flex min-h-[52px] items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isSelected
                                ? 'border-primary bg-primary/12 text-primary shadow-[var(--ft-shadow-sm)]'
                                : 'border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                            )}
                            onClick={() => field.onChange(option.key)}
                          >
                            <Icon className="size-5" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
            </FormField>

            <FormField
              label="Цвет"
              hint="Цвет категории в легендах и тегах."
              error={form.formState.errors.color?.message}
            >
              <Controller
                control={form.control}
                name="color"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                      disabled={readonly || isSaving || isDeleting}
                      className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                      aria-label="Выберите цвет категории"
                    />
                    <Input
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                      placeholder="#RRGGBB"
                      maxLength={7}
                      disabled={readonly || isSaving || isDeleting}
                    />
                  </div>
                )}
              />
            </FormField>
          </div>

          {isExpenseCategory ? (
            <FormField
              label="Учет в аналитике"
              hint="Влияет на метрики обязательных и необязательных расходов."
            >
              <Controller
                control={form.control}
                name="isMandatory"
                render={({ field }) => (
                  <label className="flex min-h-[44px] items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm text-foreground">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      disabled={readonly || isSaving || isDeleting}
                      aria-label="Обязательная категория"
                    />
                    <span>Обязательная категория</span>
                  </label>
                )}
              />
            </FormField>
          ) : null}

          {isEditMode && category ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Удалить категорию</p>
                <p className="text-xs text-muted-foreground">
                  Транзакции будут перенесены в «Без категории».
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => onDelete(category)}
                disabled={readonly || isSaving || isDeleting}
                aria-label="Удалить категорию"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={readonly || isSaving || isDeleting}>
              <Check className="size-4" />
              {isEditMode ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
