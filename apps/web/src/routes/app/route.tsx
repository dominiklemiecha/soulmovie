import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/auth-store';

export const Route = createFileRoute('/app')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) throw redirect({ to: '/login' });
    if (user.role !== 'supplier') throw redirect({ to: '/admin' });
  },
  component: () => (
    <div className="min-h-screen">
      <header className="bg-cyan-700 text-white px-6 py-3 flex justify-between">
        <span>Soulmovie · Area Fornitore</span>
        <LogoutButton />
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  ),
});

function LogoutButton() {
  const clear = useAuthStore((s) => s.clear);
  return (
    <button
      onClick={async () => {
        await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        clear();
        window.location.href = '/login';
      }}
      className="text-sm underline"
    >
      Logout
    </button>
  );
}
