import { AlertCircle } from 'lucide-react';

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative text-center text-[0.7rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 border-t border-border/70"
      />
      <span className="relative bg-[color-mix(in_srgb,var(--ft-surface-raised)_88%,transparent)] px-3">
        {label}
      </span>
    </div>
  );
}

export function AuthErrorMessage({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
