import { MoreHorizontal, Star } from 'lucide-react';
import { createElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';
import type { ManagedAccount } from './accountModels';
import { getAccountTypeIcon, getAccountTypeLabel } from './accountUtils';

interface AccountCardProps {
  account: ManagedAccount;
  baseCurrencyCode: string;
  readonly?: boolean;
  interactionLocked?: boolean;
  isPrimaryLoading?: boolean;
  isLiquidityLoading?: boolean;
  isArchiveLoading?: boolean;
  onSetPrimary: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onAdjustBalance: () => void;
  onLiquidityChange: (value: boolean) => void;
}

function AccountTypeGlyph({
  type,
}: {
  type: ManagedAccount['type'];
}) {
  return createElement(getAccountTypeIcon(type), {
    className: 'size-5 text-primary',
  });
}

export function AccountCard({
  account,
  baseCurrencyCode,
  readonly = false,
  interactionLocked = false,
  isPrimaryLoading = false,
  isLiquidityLoading = false,
  isArchiveLoading = false,
  onSetPrimary,
  onEdit,
  onArchive,
  onUnarchive,
  onAdjustBalance,
  onLiquidityChange,
}: AccountCardProps) {
  const showSecondaryBalance = account.currencyCode !== baseCurrencyCode;
  const showMenu = !interactionLocked && (!readonly || account.isArchived);

  return (
    <Card
      className={cn(
        'min-h-[180px] rounded-3xl border-border/80 transition-transform duration-200',
        !readonly && 'hover:-translate-y-0.5 hover:shadow-[var(--ft-shadow-md)]',
        account.isMain &&
          !readonly &&
          'border-primary/35 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ft-primary-400)_12%,var(--ft-surface-raised))_0%,var(--ft-surface-base)_100%)]'
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/40">
            <AccountTypeGlyph type={account.type} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-lg font-semibold">
                {account.name}
              </CardTitle>
              {account.isMain && !readonly ? (
                <Badge variant="secondary" className="gap-1 rounded-full px-2.5">
                  <Star className="size-3.5" />
                  Основной
                </Badge>
              ) : null}
            </div>
            <CardDescription>{getAccountTypeLabel(account.type)}</CardDescription>
          </div>

          {showMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="size-11 rounded-full"
                  aria-label={`Действия для счёта ${account.name}`}
                  disabled={isArchiveLoading || isPrimaryLoading}
                >
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                {!readonly ? (
                  <>
                    <DropdownMenuItem onSelect={onAdjustBalance}>
                      Корректировать баланс
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onEdit}>Переименовать</DropdownMenuItem>
                    {!account.isMain ? (
                      <DropdownMenuItem
                        onSelect={onSetPrimary}
                        disabled={isPrimaryLoading}
                      >
                        Сделать основным
                      </DropdownMenuItem>
                    ) : null}
                    {!account.isArchived ? (
                      <DropdownMenuItem
                        onSelect={onArchive}
                        disabled={isArchiveLoading}
                        destructive
                      >
                        Архивировать
                      </DropdownMenuItem>
                    ) : null}
                  </>
                ) : null}

                {account.isArchived ? (
                  <DropdownMenuItem
                    onSelect={onUnarchive}
                    disabled={isArchiveLoading}
                  >
                    Разархивировать
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-5">
        <div className="space-y-1.5">
          <div className="text-2xl font-semibold [font-variant-numeric:tabular-nums]">
            {formatCurrency(account.balanceInBaseCurrency, baseCurrencyCode)}
          </div>
          {showSecondaryBalance ? (
            <p className="text-sm text-muted-foreground [font-variant-numeric:tabular-nums]">
              {formatCurrency(account.balance, account.currencyCode)}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {account.currency?.symbol ?? '¤'} {account.currencyCode}
          </div>

          {readonly || interactionLocked ? (
            <span className="text-sm text-muted-foreground">
              {account.isLiquid ? 'Ликвидный' : 'Неликвидный'}
            </span>
          ) : (
            <label className="flex min-h-[44px] items-center gap-3 text-sm text-muted-foreground">
              <Switch
                checked={account.isLiquid}
                onCheckedChange={onLiquidityChange}
                disabled={isLiquidityLoading}
                aria-label={
                  account.isLiquid ? 'Счёт ликвидный' : 'Счёт неликвидный'
                }
              />
              <span>{account.isLiquid ? 'Ликвидный' : 'Неликвидный'}</span>
            </label>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
