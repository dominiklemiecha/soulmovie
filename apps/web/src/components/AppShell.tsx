import { ReactNode, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/auth-store';

export interface NavItem {
  to: string;
  label: string;
  icon?: ReactNode;
}

interface AppShellProps {
  brandLabel: string;
  brandColor: 'cyan' | 'slate';
  nav: NavItem[];
  children: ReactNode;
}

export function AppShell({ brandLabel, brandColor, nav, children }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const clear = useAuthStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const headerCls =
    brandColor === 'cyan' ? 'bg-cyan-700 text-white' : 'bg-slate-900 text-white';

  const onLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header
        className={`${headerCls} px-3 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-30 shadow`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Apri menu"
            className="lg:hidden p-2 -ml-2 rounded hover:bg-white/10 active:bg-white/20"
            onClick={() => setOpen(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold tracking-tight text-sm sm:text-base">{brandLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:inline text-xs opacity-80 max-w-[200px] truncate">
              {user.email}
            </span>
          )}
          <button
            onClick={onLogout}
            className="text-xs sm:text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded"
          >
            Esci
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-64 xl:w-72 shrink-0 border-r bg-white flex-col">
          <SideNav nav={nav} />
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <aside className="relative w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
              <div className="h-14 px-4 flex items-center justify-between border-b">
                <span className="font-semibold">Menu</span>
                <button
                  type="button"
                  aria-label="Chiudi menu"
                  className="p-2 -mr-2 rounded hover:bg-gray-100"
                  onClick={() => setOpen(false)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>
              <SideNav nav={nav} onItemClick={() => setOpen(false)} />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-4 sm:p-6 w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SideNav({ nav, onItemClick }: { nav: NavItem[]; onItemClick?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex-1 overflow-y-auto py-3">
      <ul className="space-y-0.5 px-2">
        {nav.map((item) => {
          const isRoot = item.to === '/admin' || item.to === '/app';
          const active = isRoot
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(item.to + '/');
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onItemClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm min-h-[44px] ${
                  active
                    ? 'bg-cyan-50 text-cyan-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
