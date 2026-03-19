import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import {
  CATEGORY_TYPE,
  type Category,
  type CategoryType,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '@/types';
import { getCategoryIconOptions, normalizeCategoryIconKey } from './categoryIcons';
import { getDefaultCategoryHexColor } from '@/utils/categoryPalette';

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

export type CategoryFormValues = z.infer<typeof formSchema>;

const DEFAULT_COLOR = getDefaultCategoryHexColor();

function getDefaultValues(category: Category | null, defaultType: CategoryType): CategoryFormValues {
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

interface UseCategoryFormOptions {
  open: boolean;
  category: Category | null;
  defaultType: CategoryType;
  readonly: boolean;
  onSubmit: (payload: CreateCategoryPayload | UpdateCategoryPayload) => Promise<void>;
}

export function useCategoryForm({
  open,
  category,
  defaultType,
  readonly,
  onSubmit,
}: UseCategoryFormOptions) {
  const isEditMode = category !== null;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(category, defaultType),
  });

  const watchedType = useWatch({ control: form.control, name: 'categoryType' }) ?? defaultType;
  const isExpenseCategory = watchedType === CATEGORY_TYPE.Expense;
  const iconOptions = getCategoryIconOptions(watchedType);

  const selectedIconKey = useWatch({ control: form.control, name: 'icon' }) ?? 'tag';

  useEffect(() => {
    if (!open) return;
    form.reset(getDefaultValues(category, defaultType));
  }, [category, defaultType, form, open]);

  useEffect(() => {
    if (isEditMode) return;
    const currentIcon = form.getValues('icon');
    const isCurrentIconAvailable = iconOptions.some((option) => option.key === currentIcon);
    if (!isCurrentIconAvailable) {
      form.setValue('icon', iconOptions[0]?.key ?? 'tag', { shouldDirty: true });
    }
  }, [form, iconOptions, isEditMode]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (readonly) return;

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

  return {
    form,
    handleSubmit,
    isEditMode,
    isExpenseCategory,
    iconOptions,
    selectedIconKey,
  };
}
