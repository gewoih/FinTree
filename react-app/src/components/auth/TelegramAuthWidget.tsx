import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { TelegramLoginPayload } from '@/types';

type WidgetStatus = 'loading' | 'ready' | 'error';

interface TelegramAuthWidgetProps {
  mode: 'login' | 'register';
  label: string;
  fallback?: ReactNode;
  onAuthenticate: (payload: TelegramLoginPayload) => Promise<boolean>;
}

export function TelegramAuthWidget({
  mode,
  label,
  fallback,
  onAuthenticate,
}: TelegramAuthWidgetProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onAuthenticateRef = useRef(onAuthenticate);
  const [status, setStatus] = useState<WidgetStatus>('loading');

  useEffect(() => {
    onAuthenticateRef.current = onAuthenticate;
  }, [onAuthenticate]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const botName =
      (import.meta.env.VITE_TELEGRAM_BOT_NAME as string | undefined) ??
      'financetree_bot';
    const callbackName =
      mode === 'login' ? '__ftTelegramLoginAuth' : '__ftTelegramRegisterAuth';
    const windowWithCallback = window as unknown as Window & Record<string, unknown>;
    let isLoaded = false;

    windowWithCallback[callbackName] = async (payload: TelegramLoginPayload) => {
      await onAuthenticateRef.current(payload);
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-request-access', 'write');

    script.onload = () => {
      isLoaded = true;
      setStatus('ready');
    };

    script.onerror = () => {
      setStatus('error');
    };

    mount.replaceChildren(script);

    const timeoutId = window.setTimeout(() => {
      if (!isLoaded) {
        setStatus('error');
      }
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
      mount.replaceChildren();

      if (windowWithCallback[callbackName]) {
        delete windowWithCallback[callbackName];
      }
    };
  }, [mode]);

  return (
    <div className="space-y-3 text-center">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div ref={mountRef} className="flex min-h-11 justify-center" />

      {status === 'error' && fallback ? (
        <p className="text-xs leading-5 text-muted-foreground">{fallback}</p>
      ) : null}
    </div>
  );
}
