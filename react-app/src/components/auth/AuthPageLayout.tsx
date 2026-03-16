import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { TrendingUp } from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';
import { PATHS } from '@/router/paths';

interface AuthPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthPageLayout({
  title,
  description,
  children,
}: AuthPageLayoutProps) {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[30rem]"
        style={{
          background:
            'radial-gradient(circle at top, color-mix(in srgb, var(--ft-primary-400) 24%, transparent), transparent 58%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--ft-info-500) 8%, transparent) 100%)',
        }}
      />
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="w-full max-w-[27rem] space-y-5 sm:space-y-6">
          <Link
            to={PATHS.HOME}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-4 py-2 text-[0.72rem] font-semibold tracking-[0.24em] text-primary uppercase shadow-[var(--ft-shadow-sm)] backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
          >
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            FinTree
          </Link>

          <div className="space-y-2.5 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem]">
              {title}
            </h1>
            <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              {description}
            </p>
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
