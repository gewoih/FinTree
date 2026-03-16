import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { Check, X } from 'lucide-react';
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
import { registerSchema, type RegisterFormValues } from '@/utils/schemas';

const PASSWORD_RULES = [
  {
    key: 'length',
    label: 'Минимум 8 символов',
    check: (value: string) => value.length >= 8,
  },
  {
    key: 'lowercase',
    label: 'Строчная буква (a-z)',
    check: (value: string) => /[a-z]/.test(value),
  },
  {
    key: 'uppercase',
    label: 'Заглавная буква (A-Z)',
    check: (value: string) => /[A-Z]/.test(value),
  },
  {
    key: 'digit',
    label: 'Цифра (0-9)',
    check: (value: string) => /\d/.test(value),
  },
  {
    key: 'special',
    label: 'Хотя бы один спецсимвол',
    check: (value: string) => /[^a-zA-Z0-9]/.test(value),
  },
] as const;

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    clearError,
    error,
    isLoading,
    loginWithTelegram,
    register,
  } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const [email, password] = useWatch({
    control: form.control,
    name: ['email', 'password'],
  });
  const hasPasswordInput = password.length > 0;

  const passwordRules = PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.check(password),
  }));

  const allRulesMet = passwordRules.every((rule) => rule.met);

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

  const handleRegister = form.handleSubmit(async (values) => {
    const isAuthenticated = await register({
      email: values.email,
      password: values.password,
      passwordConfirmation: values.password,
    });

    if (isAuthenticated) {
      await navigate({ to: PATHS.ANALYTICS });
    }
  });

  return (
    <AuthPageLayout
      title="Начните учет финансов"
      description="Создайте аккаунт через Telegram или откройте email-регистрацию."
    >
      <Card
        className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-[color-mix(in_srgb,var(--ft-surface-raised)_88%,transparent)] shadow-(--ft-shadow-2xl) backdrop-blur-xl"
      >
        <CardContent className="space-y-6 px-5 pt-5 pb-6 sm:px-6 sm:pt-6">
          <TelegramAuthWidget
            mode="register"
            label="Регистрация через Telegram"
            fallback={
              <>
                Виджет Telegram не загрузился.{' '}
                <button
                  type="button"
                  className="font-medium text-primary underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary/80"
                  onClick={() => setShowEmailForm(true)}
                >
                  Зарегистрируйтесь через Email
                </button>
              </>
            }
            onAuthenticate={handleTelegramAuth}
          />

          <AuthDivider label="или" />

          {!showEmailForm ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-12 w-full rounded-xl"
              onClick={() => setShowEmailForm(true)}
            >
              Зарегистрироваться через Email
            </Button>
          ) : (
            <form className="space-y-4" onSubmit={handleRegister} noValidate>
              <FormField
                id="register-email"
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
                id="register-password"
                label="Пароль"
                required
                error={form.formState.errors.password?.message}
                className="text-left"
              >
                <PasswordInput
                  placeholder="Минимум 8 символов"
                  autoComplete="new-password"
                  visible={showPassword}
                  onToggleVisibility={() => setShowPassword((current) => !current)}
                  {...form.register('password')}
                />
              </FormField>

              {hasPasswordInput ? (
                <ul className="grid gap-1.5 text-xs">
                  {passwordRules.map((rule) => (
                    <li
                      key={rule.key}
                      className={
                        rule.met
                          ? 'flex items-center gap-2 text-[var(--ft-success-500)]'
                          : 'flex items-center gap-2 text-destructive'
                      }
                    >
                      {rule.met ? (
                        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{rule.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {error ? <AuthErrorMessage message={error} /> : null}

              <Button
                type="submit"
                size="lg"
                className="min-h-12 w-full rounded-xl"
                disabled={isLoading || !email || !password || !allRulesMet}
              >
                {isLoading ? 'Создаём аккаунт…' : 'Создать аккаунт'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center gap-2 border-t border-border/60 bg-background/25 text-sm">
          <span className="text-muted-foreground">Уже есть аккаунт?</span>
          <Link
            to={PATHS.LOGIN}
            className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
          >
            Войти
          </Link>
        </CardFooter>
      </Card>
    </AuthPageLayout>
  );
}
