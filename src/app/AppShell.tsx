import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CURRENT_USER } from '@/domain/constants';
import { useOfferStore } from '@/store/offers';
import { ContactWidget } from '@/features/contact/ContactWidget';

export function Logo({ className }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}swisslife-logo.png`} alt="Swiss Life" className={clsx('object-contain', className)} />;
}

/** Dekorativer Bogen, angelehnt an die Swiss Life Logobox. */
export function BrandArc({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={clsx('pointer-events-none', className)} aria-hidden="true">
      <defs>
        <linearGradient id="arc-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D82034" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#A11C36" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d="M600 0 C 420 40, 250 160, 170 360 C 120 480, 130 560, 150 600 L 600 600 Z" fill="url(#arc-a)" />
      <path d="M600 90 C 470 120, 340 220, 280 380 C 245 470, 250 545, 262 600" fill="none" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="18" />
      <path d="M600 190 C 510 210, 420 290, 380 400 C 355 470, 358 540, 366 600" fill="none" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="12" />
    </svg>
  );
}

export function UserChip() {
  return (
    <div className="hidden items-center gap-2.5 sm:flex">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{CURRENT_USER.initials}</div>
      <div className="leading-tight">
        <div className="text-sm font-medium text-ink">{CURRENT_USER.name}</div>
        <div className="text-xs text-ink-muted">Kundenberater</div>
      </div>
    </div>
  );
}

export function AppHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const logout = useOfferStore((s) => s.logout);
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-[82.5rem] items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-4">
          <Logo className="h-9 w-auto shrink-0" />
          <div className="hidden h-8 w-px bg-line md:block" />
          <div className="hidden min-w-0 md:block">
            <div className="truncate font-serif text-lg font-semibold leading-tight text-ink">{title}</div>
            {subtitle && <div className="truncate text-xs text-ink-muted">{subtitle}</div>}
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {actions}
          <UserChip />
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-full p-2 text-ink-muted transition hover:bg-surface-muted hover:text-ink"
            title="Abmelden"
            aria-label="Abmelden"
          >
            <LogOut className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function PageShell({ children, header, contactContext }: { children: ReactNode; header: ReactNode; contactContext?: string }) {
  return (
    <div className="relative min-h-screen">
      <div className="bg-grain pointer-events-none fixed inset-0 opacity-60" />
      {header}
      <main className="relative mx-auto max-w-[82.5rem] px-4 pb-24 pt-8 sm:px-6">{children}</main>
      <ContactWidget context={contactContext} />
    </div>
  );
}
