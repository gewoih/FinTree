import { useCurrentUser } from '@/features/auth/session';
import { Button } from '../ui/button';

interface ReadOnlyBannerProps {
  onPayClick: () => void;
}

export function ReadOnlyBanner({ onPayClick }: ReadOnlyBannerProps) {
  const subscription = useCurrentUser()?.subscription;
  const expiresLabel = subscription?.expiresAtUtc
    ? new Date(subscription.expiresAtUtc).toLocaleDateString('ru-RU')
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2 text-sm"
    >
      <span className="text-foreground">
        Режим просмотра: подписка неактивна
        {expiresLabel ? ` (истекла ${expiresLabel})` : ''}.
      </span>
      <Button size="sm" variant="outline" onClick={onPayClick}>
        Оплатить
      </Button>
    </div>
  );
}
