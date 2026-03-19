import {
  BarChart2,
  BookOpen,
  Briefcase,
  List,
  Tags,
  Target,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { PATHS } from '@/router/paths';

export interface NavItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
}

/** Primary navigation — visible in sidebar and bottom tab bar */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Главная', icon: BarChart2, to: PATHS.ANALYTICS },
  { label: 'Счета', icon: Wallet, to: PATHS.ACCOUNTS },
  { label: 'Транзакции', icon: List, to: PATHS.TRANSACTIONS },
  { label: 'Инвестиции', icon: Briefcase, to: PATHS.INVESTMENTS },
  { label: 'Цели', icon: Target, to: PATHS.GOALS },
  { label: 'Рефлексии', icon: BookOpen, to: PATHS.REFLECTIONS },
];

/** Secondary navigation — visible in sidebar below the divider */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: 'Категории', icon: Tags, to: PATHS.CATEGORIES },
];

/** Items placed in the "More" overflow menu on mobile */
export const MOBILE_MORE_ITEMS: NavItem[] = [
  { label: 'Цели', icon: Target, to: PATHS.GOALS },
  { label: 'Рефлексии', icon: BookOpen, to: PATHS.REFLECTIONS },
];

/** The 4 tabs shown directly in the mobile bottom bar */
export const MOBILE_PRIMARY_TABS: NavItem[] = [
  { label: 'Главная', icon: BarChart2, to: PATHS.ANALYTICS },
  { label: 'Счета', icon: Wallet, to: PATHS.ACCOUNTS },
  { label: 'Транзакции', icon: List, to: PATHS.TRANSACTIONS },
  { label: 'Инвестиции', icon: Briefcase, to: PATHS.INVESTMENTS },
];
