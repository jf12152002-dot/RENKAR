import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`glass rounded-[1.65rem] p-4 ${className}`}>{children}</section>;
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const variants = {
    primary: 'bg-emerald-700 text-white shadow-glow hover:bg-emerald-800',
    ghost: 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
  };
  return (
    <button
      {...props}
      className={`rounded-2xl px-4 py-3 text-sm font-bold tracking-wide transition hover:-translate-y-0.5 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm text-slate-600">
      <span className="font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-emerald-600/15 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'gold' }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    ok: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    gold: 'bg-amber-50 text-amber-700'
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Stat({ label, value, accent = 'text-slate-950' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-black ${accent}`}>{value}</p>
    </div>
  );
}
