import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { TrendingUp } from 'lucide-react';
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
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            'radial-gradient(circle at top, color-mix(in srgb, var(--ft-primary-400) 22%, transparent), transparent 60%)',
        }}
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-4">
          <Link
            to={PATHS.HOME}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-primary uppercase backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
          >
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            FinTree
          </Link>

          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
