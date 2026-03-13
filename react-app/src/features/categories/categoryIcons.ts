import { createElement, type ReactElement } from 'react';
import {
  BookOpen,
  Briefcase,
  Building2,
  Car,
  CreditCard,
  Gift,
  Globe,
  Heart,
  House,
  Monitor,
  Palette,
  Percent,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Smile,
  Tag,
  TrendingUp,
  Wallet,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import { CATEGORY_TYPE, type CategoryType } from '@/types';

export interface CategoryIconOption {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface CategoryIconDefinition extends CategoryIconOption {
  types: CategoryType[];
}

const CATEGORY_ICON_DEFINITIONS: CategoryIconDefinition[] = [
  { key: 'tag', label: 'Метка', icon: Tag, types: [CATEGORY_TYPE.Expense, CATEGORY_TYPE.Income] },
  { key: 'shopping-cart', label: 'Покупки', icon: ShoppingCart, types: [CATEGORY_TYPE.Expense] },
  { key: 'shopping-bag', label: 'Шопинг', icon: ShoppingBag, types: [CATEGORY_TYPE.Expense] },
  { key: 'house', label: 'Дом', icon: House, types: [CATEGORY_TYPE.Expense] },
  { key: 'car', label: 'Транспорт', icon: Car, types: [CATEGORY_TYPE.Expense] },
  { key: 'heart', label: 'Здоровье', icon: Heart, types: [CATEGORY_TYPE.Expense] },
  { key: 'smile', label: 'Досуг', icon: Smile, types: [CATEGORY_TYPE.Expense] },
  { key: 'globe', label: 'Путешествия', icon: Globe, types: [CATEGORY_TYPE.Expense] },
  { key: 'book-open', label: 'Обучение', icon: BookOpen, types: [CATEGORY_TYPE.Expense] },
  { key: 'palette', label: 'Хобби', icon: Palette, types: [CATEGORY_TYPE.Expense] },
  { key: 'credit-card', label: 'Платежи', icon: CreditCard, types: [CATEGORY_TYPE.Expense] },
  { key: 'refresh-cw', label: 'Подписки', icon: RefreshCw, types: [CATEGORY_TYPE.Expense] },
  { key: 'briefcase', label: 'Работа', icon: Briefcase, types: [CATEGORY_TYPE.Income] },
  { key: 'wallet', label: 'Доход', icon: Wallet, types: [CATEGORY_TYPE.Income] },
  { key: 'building-2', label: 'Бизнес', icon: Building2, types: [CATEGORY_TYPE.Income] },
  { key: 'trending-up', label: 'Инвестиции', icon: TrendingUp, types: [CATEGORY_TYPE.Income] },
  { key: 'gift', label: 'Подарок', icon: Gift, types: [CATEGORY_TYPE.Income] },
  { key: 'percent', label: 'Проценты', icon: Percent, types: [CATEGORY_TYPE.Income] },
  { key: 'monitor', label: 'Фриланс', icon: Monitor, types: [CATEGORY_TYPE.Income] },
];

const CATEGORY_ICON_MAP = new Map(
  CATEGORY_ICON_DEFINITIONS.map((definition) => [definition.key, definition]),
);

const LEGACY_ICON_ALIASES: Record<string, string> = {
  'pi-tag': 'tag',
  'pi-tags': 'tag',
  'pi-shopping-cart': 'shopping-cart',
  'pi-shopping-bag': 'shopping-bag',
  'pi-home': 'house',
  'pi-car': 'car',
  'pi-heart': 'heart',
  'pi-face-smile': 'smile',
  'pi-globe': 'globe',
  'pi-book': 'book-open',
  'pi-palette': 'palette',
  'pi-credit-card': 'credit-card',
  'pi-refresh': 'refresh-cw',
  'pi-briefcase': 'briefcase',
  'pi-building': 'building-2',
  'pi-chart-line': 'trending-up',
  'pi-star': 'trending-up',
  'pi-gift': 'gift',
  'pi-percentage': 'percent',
  'pi-desktop': 'monitor',
};

export const DEFAULT_CATEGORY_ICON_KEY = 'tag';

export function normalizeCategoryIconKey(iconName: string | null | undefined): string {
  if (!iconName) {
    return DEFAULT_CATEGORY_ICON_KEY;
  }

  const normalized = LEGACY_ICON_ALIASES[iconName] ?? iconName;
  return CATEGORY_ICON_MAP.has(normalized) ? normalized : DEFAULT_CATEGORY_ICON_KEY;
}

export function getCategoryIcon(iconName: string | null | undefined): LucideIcon {
  return CATEGORY_ICON_MAP.get(normalizeCategoryIconKey(iconName))?.icon ?? Tag;
}

export function renderCategoryIcon(
  iconName: string | null | undefined,
  props?: LucideProps,
): ReactElement {
  return createElement(getCategoryIcon(iconName), props);
}

export function getCategoryIconLabel(iconName: string | null | undefined): string {
  return CATEGORY_ICON_MAP.get(normalizeCategoryIconKey(iconName))?.label ?? 'Метка';
}

export function getCategoryIconOptions(type: CategoryType): CategoryIconOption[] {
  return CATEGORY_ICON_DEFINITIONS.filter((definition) => definition.types.includes(type)).map(
    ({ key, label, icon }) => ({ key, label, icon }),
  );
}
