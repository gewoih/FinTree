import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InvestmentActionsMenuProps {
  accountName: string;
  readonly?: boolean;
  interactionLocked?: boolean;
  isLiquid: boolean;
  isArchived: boolean;
  isLiquidityLoading?: boolean;
  isArchiveLoading?: boolean;
  onAdjustBalance: () => void;
  onRename: () => void;
  onToggleLiquidity: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
}

export function InvestmentActionsMenu({
  accountName,
  readonly = false,
  interactionLocked = false,
  isLiquid,
  isArchived,
  isLiquidityLoading = false,
  isArchiveLoading = false,
  onAdjustBalance,
  onRename,
  onToggleLiquidity,
  onArchive,
  onUnarchive,
}: InvestmentActionsMenuProps) {
  if (interactionLocked) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-lg border border-border/70 bg-background/40 shadow-[var(--ft-shadow-sm)] hover:bg-muted/80"
          aria-label={`Действия для счёта ${accountName}`}
          disabled={isArchiveLoading}
        >
          <MoreVertical className="size-[18px]" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        {readonly || isArchived ? (
          <DropdownMenuItem onSelect={onUnarchive} disabled={isArchiveLoading}>
            Разархивировать
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onSelect={onAdjustBalance}>
              Корректировать баланс
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRename}>Переименовать счёт</DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onToggleLiquidity}
              disabled={isLiquidityLoading || isArchiveLoading}
            >
              {isLiquid ? 'Сделать неликвидным' : 'Сделать ликвидным'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onArchive}
              disabled={isArchiveLoading}
              destructive
            >
              Архивировать
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
