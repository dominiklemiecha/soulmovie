import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/lib/auth-store';
import { AppShell, NavItem } from '@/components/AppShell';

const fullNav: NavItem[] = [
  { to: '/app/profilo', label: 'Società' },
  { to: '/app/contatti', label: 'Contatti' },
  { to: '/app/categorie', label: 'Categorie merceologiche' },
  { to: '/app/certificati', label: 'Certificati' },
  { to: '/app/impostazioni', label: 'Impostazioni personali' },
];
const restrictedNav: NavItem[] = [
  { to: '/app/profilo', label: 'Società' },
  { to: '/app/impostazioni', label: 'Impostazioni personali' },
];

export const Route = createFileRoute('/app')({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user) throw redirect({ to: '/login' });
    if (user.role !== 'supplier') throw redirect({ to: '/admin' });
  },
  component: AppArea,
});

function AppArea() {
  const user = useAuthStore((s) => s.user);
  const approved = user?.supplierApprovalStatus === 'approved';
  return (
    <AppShell
      brandLabel="Soulmovie · Area Fornitore"
      brandColor="cyan"
      nav={approved ? fullNav : restrictedNav}
    >
      {!approved && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
          <strong>Account in attesa di approvazione.</strong> Completa l'anagrafica della tua
          società (P.IVA, indirizzo, città, contatti) e l'amministratore potrà approvarti. Le altre
          sezioni (Contatti, Categorie, Certificati) saranno sbloccate dopo l'approvazione.
        </div>
      )}
      <Outlet />
    </AppShell>
  );
}
