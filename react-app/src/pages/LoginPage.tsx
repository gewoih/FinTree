import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm, useWatch } from 'react-hook-form';
import {
  AuthDivider,
  AuthErrorMessage,
} from '@/components/auth/AuthContentParts';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { TelegramAuthWidget } from '@/components/auth/TelegramAuthWidget';
import { FormField } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { PATHS } from '@/router/paths';
import type { TelegramLoginPayload } from '@/types';
import { loginSchema, type LoginFormValues } from '@/utils/schemas';

export default function LoginPage() {
  const navigate = useNavigate();
  const {
    clearError,
    error,
    isLoading,
    login,
    loginWithTelegram,
  } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const [email, password] = useWatch({
    control: form.control,
    name: ['email', 'password'],
  });

  useEffect(() => {
    clearError();

    return () => {
      clearError();
    };
  }, [clearError]);

  const handleTelegramAuth = async (payload: TelegramLoginPayload) => {
    const isAuthenticated = await loginWithTelegram(payload);

    if (isAuthenticated) {
      await navigate({ to: PATHS.ANALYTICS });
    }

    return isAuthenticated;
  };

  const handleLogin = form.handleSubmit(async (values) => {
    const isAuthenticated = await login(values);

    if (isAuthenticated) {
      await navigate({ to: PATHS.ANALYTICS });
    }
  });

  return (
    <AuthPageLayout
      title="С возвращением!"
      description="Войдите через Telegram или продолжите работу по email."
    >
      <Card className="border-border/70 bg-card/90 shadow-2xl backdrop-blur">
        <CardContent className="space-y-6 px-5 pt-5 sm:px-6 sm:pt-6">
          <TelegramAuthWidget
            mode="login"
            label="Войти через Telegram"
            fallback="Виджет Telegram не загрузился. Используйте Email-вход ниже."
            onAuthenticate={handleTelegramAuth}
          />

          <AuthDivider label="или через Email" />

          <form className="space-y-4" onSubmit={handleLogin} noValidate>
            <FormField
              id="login-email"
              label="Email"
              required
              error={form.formState.errors.email?.message}
              className="text-left"
            >
              <Input
                type="email"
                placeholder="name@domain.com"
                autoComplete="email"
                {...form.register('email')}
              />
            </FormField>

            <FormField
              id="login-password"
              label="Пароль"
              required
              error={form.formState.errors.password?.message}
              className="text-left"
            >
              <PasswordInput
                placeholder="Введите пароль"
                autoComplete="current-password"
                visible={showPassword}
                onToggleVisibility={() => setShowPassword((current) => !current)}
                {...form.register('password')}
              />
            </FormField>

            {error ? <AuthErrorMessage message={error} /> : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading || !email || !password}
            >
              {isLoading ? 'Входим…' : 'Войти'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center gap-2 border-t border-border/60 bg-muted/30 text-sm">
          <span className="text-muted-foreground">Нет аккаунта?</span>
          <Link
            to={PATHS.REGISTER}
            className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
          >
            Зарегистрироваться
          </Link>
        </CardFooter>
      </Card>
    </AuthPageLayout>
  );
}
