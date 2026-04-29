import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/Field';

export const Route = createFileRoute('/admin/')({ component: AdminDashboard });

interface Counter {
  total: number;
}
interface SupplierItem {
  id: string;
  ragioneSociale: string;
  partitaIva?: string | null;
  citta?: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  registrationSource: 'self' | 'invite';
  createdAt: string;
  userEmail?: string | null;
}
interface CertItem {
  id: string;
  dataScadenza: string | null;
  documentFilename: string;
  status: string;
  supplier: { id: string; ragioneSociale: string };
  type: { name: string };
}

function AdminDashboard() {
  const pending = useQuery<Counter>({
    queryKey: ['dash', 'sup', 'pending'],
    queryFn: async () =>
      (await api.get('/admin/suppliers', { params: { status: 'pending', pageSize: 1 } })).data,
  });
  const approved = useQuery<Counter>({
    queryKey: ['dash', 'sup', 'approved'],
    queryFn: async () =>
      (await api.get('/admin/suppliers', { params: { status: 'approved', pageSize: 1 } })).data,
  });
  const rejected = useQuery<Counter>({
    queryKey: ['dash', 'sup', 'rejected'],
    queryFn: async () =>
      (await api.get('/admin/suppliers', { params: { status: 'rejected', pageSize: 1 } })).data,
  });
  const expired = useQuery<Counter>({
    queryKey: ['dash', 'cert', 'expired'],
    queryFn: async () =>
      (await api.get('/admin/certificates', { params: { window: 'expired', pageSize: 1 } })).data,
  });
  const expiring30 = useQuery<Counter>({
    queryKey: ['dash', 'cert', '30'],
    queryFn: async () =>
      (await api.get('/admin/certificates', { params: { window: '30', pageSize: 1 } })).data,
  });

  const recent = useQuery<{ items: SupplierItem[] }>({
    queryKey: ['dash', 'recent-suppliers'],
    queryFn: async () =>
      (await api.get('/admin/suppliers', { params: { status: 'all', pageSize: 5 } })).data,
  });
  const upcoming = useQuery<{ items: CertItem[] }>({
    queryKey: ['dash', 'upcoming-certs'],
    queryFn: async () =>
      (await api.get('/admin/certificates', { params: { window: '60', pageSize: 5 } })).data,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Panoramica operativa del portale fornitori."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi
          label="In attesa di approvazione"
          value={pending.data?.total ?? '—'}
          to="/admin/fornitori-pending"
          search={{ status: 'pending' }}
          tone="amber"
        />
        <Kpi
          label="Fornitori approvati"
          value={approved.data?.total ?? '—'}
          to="/admin/fornitori-pending"
          search={{ status: 'approved' }}
          tone="green"
        />
        <Kpi
          label="Fornitori rifiutati"
          value={rejected.data?.total ?? '—'}
          to="/admin/fornitori-pending"
          search={{ status: 'rejected' }}
          tone="slate"
        />
        <Kpi
          label="Certificati scaduti"
          value={expired.data?.total ?? '—'}
          to="/admin/scadenze"
          search={{ window: 'expired' }}
          tone="red"
        />
        <Kpi
          label="Scadono entro 30g"
          value={expiring30.data?.total ?? '—'}
          to="/admin/scadenze"
          search={{ window: '30' }}
          tone="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Ultimi fornitori registrati" linkTo="/admin/fornitori-pending" linkSearch={{ status: 'all' }}>
          {recent.data?.items.length === 0 ? (
            <Empty text="Nessun fornitore." />
          ) : (
            <ul className="divide-y">
              {(recent.data?.items ?? []).map((s) => (
                <li key={s.id} className="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      <Link to={`/admin/fornitori/${s.id}`} className="text-cyan-800 hover:underline">
                        {s.ragioneSociale}
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {s.userEmail ?? '—'} · {s.registrationSource === 'self' ? 'Self' : 'Invito'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <SupBadge s={s.approvalStatus} />
                    <span className="text-[11px] text-gray-500">
                      {fmtDate(s.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Prossime scadenze certificati" linkTo="/admin/scadenze" linkSearch={{ window: '60' }}>
          {upcoming.data?.items.length === 0 ? (
            <Empty text="Nessuna scadenza nei prossimi 60 giorni." />
          ) : (
            <ul className="divide-y">
              {(upcoming.data?.items ?? []).map((c) => (
                <li key={c.id} className="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      <Link
                        to={`/admin/fornitori/${c.supplier.id}`}
                        className="text-cyan-800 hover:underline"
                      >
                        {c.supplier.ragioneSociale}
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500 truncate">{c.type.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <CertBadge status={c.status} />
                    <span className="text-[11px] text-gray-500">{fmtDate(c.dataScadenza)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  to,
  search,
  tone,
}: {
  label: string;
  value: string | number;
  to: string;
  search?: Record<string, string>;
  tone: 'amber' | 'green' | 'slate' | 'red' | 'orange';
}) {
  const accent = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    green: 'border-green-200 bg-green-50 text-green-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    red: 'border-red-200 bg-red-50 text-red-900',
    orange: 'border-orange-200 bg-orange-50 text-orange-900',
  }[tone];
  return (
    <Link
      to={to}
      search={search as any}
      className={`block rounded-lg border p-4 hover:shadow-sm transition-shadow ${accent}`}
    >
      <p className="text-[11px] uppercase tracking-wide opacity-80 leading-tight">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </Link>
  );
}

function Card({
  title,
  linkTo,
  linkSearch,
  children,
}: {
  title: string;
  linkTo: string;
  linkSearch?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <header className="px-4 py-2.5 border-b flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        <Link
          to={linkTo}
          search={linkSearch as any}
          className="text-xs text-cyan-700 hover:underline"
        >
          Vedi tutti →
        </Link>
      </header>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-sm text-gray-500">{text}</p>;
}

function SupBadge({ s }: { s: 'pending' | 'approved' | 'rejected' }) {
  const map = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  } as const;
  const lbl = { pending: 'In attesa', approved: 'Approvato', rejected: 'Rifiutato' }[s];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${map[s]}`}>
      {lbl}
    </span>
  );
}

function CertBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    valid: { label: 'Valido', cls: 'bg-green-100 text-green-800 border-green-200' },
    expiring_60: { label: '≤ 60g', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    expiring_30: { label: '≤ 30g', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
    expiring_7: { label: '≤ 7g', cls: 'bg-orange-100 text-orange-800 border-orange-300' },
    expired: { label: 'Scaduto', cls: 'bg-red-100 text-red-800 border-red-200' },
    no_expiry: { label: 'No scadenza', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  };
  const m = map[status] ?? map.valid;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border ${m.cls}`}>
      {m.label}
    </span>
  );
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('it-IT');
  } catch {
    return String(d);
  }
}
