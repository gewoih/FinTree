import { useState } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { HelpCircle } from 'lucide-react';

import { cn } from '@/utils/cn';

interface InfoTooltipProps {
  content: string;
  ariaLabel?: string;
  className?: string;
}

export function InfoTooltip({
  content,
  ariaLabel = 'Подробнее',
  className,
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[var(--ft-text-tertiary)] transition-colors',
              'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className,
            )}
            onClick={() => setOpen((prev) => !prev)}
          >
            <HelpCircle className="size-4" aria-hidden="true" />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            sideOffset={6}
            className={cn(
              'z-50 max-w-[280px] rounded-lg border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md',
              'animate-in fade-in-0 zoom-in-95',
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-border" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
