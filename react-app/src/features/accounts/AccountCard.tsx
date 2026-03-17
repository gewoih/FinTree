import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/cn';
import type { ManagedAccount } from './accountModels';

interface AccountCardProps {
  account: ManagedAccount;
  readonly?: boolean;
  interactionLocked?: boolean;
  isPrimaryLoading?: boolean;
  isArchiveLoading?: boolean;
  onSetPrimary: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
}

export function AccountCard({
  account,
  readonly = false,
  interactionLocked = false,
  isPrimaryLoading = false,
  isArchiveLoading = false,
  onSetPrimary,
  onEdit,
  onArchive,
  onUnarchive,
}: AccountCardProps) {
  const showMenu = !interactionLocked && (!readonly || account.isArchived);

  return (
    <article
      className={cn(
        'flex min-h-[160px] flex-col rounded-xl border border-border/80 bg-card/95 px-5 py-5 text-foreground shadow-[var(--ft-shadow-sm)] transition-[border-color,box-shadow,background-color] duration-200',
        !readonly && 'hover:border-primary/35 hover:shadow-[var(--ft-shadow-md)]',
        account.isMain &&
          !readonly &&
          'border-primary/45 bg-primary/5',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {account.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Банковский счёт</p>
        </div>

        {showMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-11 rounded-xl border border-border/70 bg-background/30 shadow-[var(--ft-shadow-sm)] hover:bg-muted/80"
                aria-label={`Действия для счёта ${account.name}`}
                disabled={isArchiveLoading || isPrimaryLoading}
              >
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              {!readonly ? (
                <>
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

      <div className="mt-auto border-t border-border/70 pt-4">
        <div className="text-xl font-medium text-primary [font-variant-numeric:tabular-nums]">
          {account.currency?.symbol ?? '¤'} {account.currencyCode}
        </div>
      </div>
    </article>
  );
}
