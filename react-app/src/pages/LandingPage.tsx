import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  BarChart3,
  Bolt,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import analyticsImage from '@/assets/landing/analytics.png';
import accountsImage from '@/assets/landing/accounts.png';
import forecastImage from '@/assets/landing/forecast.png';
import investmentsImage from '@/assets/landing/investments.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PATHS } from '@/router/paths';

const dashboardScreens = [
  {
    title: 'Страница счетов',
    description: 'Все счета в одном месте, без ручной сводки по приложениям и картам.',
    image: accountsImage,
    alt: 'Скриншот страницы счетов в FinTree',
  },
  {
    title: 'Учет инвестиций',
    description: 'Портфель и динамика на одном экране, без таблиц и ручного суммирования.',
    image: investmentsImage,
    alt: 'Скриншот страницы инвестиций в FinTree',
  },
  {
    title: 'Прогноз расходов',
    description: 'Понимание, сколько денег нужно до конца месяца и где начинается риск.',
    image: forecastImage,
    alt: 'Скриншот прогноза расходов в FinTree',
  },
] as const;

const features = [
  {
    icon: Bolt,
    title: 'Быстрый старт без барьеров',
    description: 'Регистрация занимает пару минут, а первый месяц вы пользуетесь бесплатно.',
  },
  {
    icon: BarChart3,
    title: 'Ясная картина расходов',
    description: 'FinTree сразу показывает, куда уходит бюджет и где можно сэкономить.',
  },
  {
    icon: ShieldCheck,
    title: 'Контроль и безопасность',
    description: 'Вы сами управляете данными, без привязки банковской карты на старте.',
  },
] as const;

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  note: string;
  description: string;
  accent: boolean;
  oldPrice?: string;
  badge?: string;
}

const pricing: PricingPlan[] = [
  {
    name: 'Месяц',
    price: '390 ₽',
    period: 'в месяц',
    note: 'После бесплатного месяца',
    description: 'Помесячная оплата без долгих обязательств.',
    accent: false,
  },
  {
    name: 'Год',
    oldPrice: '4 680 ₽',
    price: '3 900 ₽',
    period: 'в год',
    note: '325 ₽ в месяц после триала',
    description: 'Экономия 780 ₽ в год.',
    accent: true,
    badge: 'Лучший выбор',
  },
];

const trustPoints = [
  { icon: ShieldCheck, label: 'Данные под защитой' },
  { icon: Bolt, label: 'Запись расхода за 10 секунд' },
  { icon: Wallet, label: 'Без банковских интеграций' },
] as const;

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

export default function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
        style={{
          background:
            'radial-gradient(circle at top, color-mix(in srgb, var(--ft-primary-400) 22%, transparent), transparent 58%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-56 h-[28rem]"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--ft-info-500) 10%, transparent) 45%, transparent 100%)',
        }}
      />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16 lg:gap-24 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase text-primary shadow-[var(--ft-shadow-sm)] backdrop-blur-sm">
              <CreditCard className="size-3.5" />
              0 ₽ в первый месяц
            </div>

            <div className="space-y-5">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Поймите, куда уходят деньги, без сложных таблиц.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                FinTree собирает расходы в одном месте и сразу показывает, где можно сократить траты,
                чтобы бюджет перестал ощущаться хаосом.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="min-h-12 rounded-xl px-5 shadow-[var(--ft-shadow-cta)]">
                <Link to={PATHS.REGISTER}>
                  Попробовать бесплатно
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12 rounded-xl px-5">
                <Link to={PATHS.LOGIN}>У меня уже есть аккаунт</Link>
              </Button>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Без привязки карты и скрытых условий.</p>
              <p>Без карты • 2 минуты на старт • отмена в любой момент</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToSection('screens')}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Экраны
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Возможности
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Тарифы
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustPoints.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border/60 bg-background/55 px-4 py-4 shadow-[var(--ft-shadow-sm)] backdrop-blur-sm"
                >
                  <item.icon className="mb-3 size-5 text-primary" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <Card
            className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-[color-mix(in_srgb,var(--ft-surface-raised)_82%,transparent)] py-0 shadow-[var(--ft-shadow-xl)]"
            style={{
              boxShadow:
                '0 28px 70px color-mix(in srgb, var(--ft-primary-900) 42%, transparent)',
            }}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="overflow-hidden rounded-[1.35rem] border border-border/50 bg-[color-mix(in_srgb,var(--ft-surface-overlay)_78%,transparent)] p-2">
                <img
                  src={analyticsImage}
                  alt="Скриншот главной страницы аналитики в FinTree"
                  className="h-auto w-full rounded-[1rem] object-cover"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <section id="screens" className="space-y-6 scroll-mt-24">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
              Реальные экраны
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Кабинет после регистрации, а не обещания на лендинге.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Живые экраны без мокапов: видно, как выглядят счета, инвестиции и прогноз расходов уже в работе.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {dashboardScreens.map((screen) => (
              <Card
                key={screen.title}
                className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-[color-mix(in_srgb,var(--ft-surface-raised)_78%,transparent)] py-0 shadow-[var(--ft-shadow-lg)]"
              >
                <CardContent className="space-y-4 p-4">
                  <div className="overflow-hidden rounded-[1.1rem] border border-border/50 bg-background/60">
                    <img src={screen.image} alt={screen.alt} className="h-auto w-full object-cover" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{screen.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{screen.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="features" className="space-y-6 scroll-mt-24">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
              Почему работает
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Минимум действий, максимум ясности.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Продукт создан для людей, которым нужна предсказуемость бюджета, а не еще один перегруженный сервис.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="rounded-[1.5rem] border border-border/60 bg-[color-mix(in_srgb,var(--ft-surface-raised)_78%,transparent)] shadow-[var(--ft-shadow-md)]"
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <feature.icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 rounded-[2rem] border border-border/60 px-5 py-6 sm:px-6 sm:py-8 lg:px-8"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-raised) 88%, transparent) 0%, color-mix(in srgb, var(--ft-surface-base) 92%, transparent) 100%)',
          }}
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="space-y-4">
              <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
                Тарифы без сюрпризов
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Полный функционал в обоих тарифах.
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                Первый месяц бесплатный для всех новых пользователей. Сначала пользуетесь, потом решаете,
                какой режим оплаты удобнее.
              </p>
              <div className="rounded-[1.35rem] border border-primary/20 bg-primary/10 px-4 py-4 text-sm text-foreground">
                Сначала пользуетесь бесплатно, потом выбираете удобный тариф.
              </div>
              <Button asChild size="lg" className="min-h-12 rounded-xl px-5 shadow-[var(--ft-shadow-cta)]">
                <Link to={PATHS.REGISTER}>Попробовать бесплатно</Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {pricing.map((plan) => (
                <Card
                  key={plan.name}
                  className="rounded-[1.5rem] border py-0 shadow-[var(--ft-shadow-md)]"
                  style={{
                    borderColor: plan.accent
                      ? 'color-mix(in srgb, var(--ft-primary-400) 36%, var(--ft-border-default))'
                      : 'color-mix(in srgb, var(--ft-border-default) 78%, transparent)',
                    backgroundColor: plan.accent
                      ? 'color-mix(in srgb, var(--ft-primary-500) 12%, var(--ft-surface-raised))'
                      : 'color-mix(in srgb, var(--ft-surface-raised) 78%, transparent)',
                  }}
                >
                  <CardContent className="space-y-5 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{plan.note}</p>
                      </div>
                      {plan.badge ? (
                        <span className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      {'oldPrice' in plan ? (
                        <p className="text-sm text-muted-foreground line-through">{plan.oldPrice}</p>
                      ) : null}
                      <div className="flex items-end gap-2">
                        <strong className="text-4xl font-semibold tracking-tight text-foreground">
                          {plan.price}
                        </strong>
                        <span className="pb-1 text-sm text-muted-foreground">{plan.period}</span>
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
