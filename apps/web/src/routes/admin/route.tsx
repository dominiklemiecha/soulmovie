import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/auth-store';
import { AppShell, NavItem } from '@/components/AppShell';

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/fornitori-pending', label: 'Fornitori' },
  { to: '/admin/scadenze', label: 'Scadenze documenti' },
  { to: '/admin/categorie', label: 'Categorie merceologiche' },
  { to: '/admin/tipologie-certificati', label: 'Tipologie certificati' },
  { to: '/admin/smtp', label: 'Configurazione SMTP' },
];

export const Route = createFileRoute('/admin')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) throw redirect({ to: '/login' });
    if (user.role !== 'admin') throw redirect({ to: '/app' });
  },
  component: () => (
    <AppShell brandLabel="Soulmovie · Admin" brandColor="slate" nav={adminNav}>
      <Outlet />
    </AppShell>
  ),
});
