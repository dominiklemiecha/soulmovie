import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CertificateStatus } from '@soulmovie/shared';
import { api } from '@/lib/api';
import { PageHeader, SecondaryButton } from '@/components/Field';

export const Route = createFileRoute('/admin/fornitori/$id')({ component: SupplierDetailPage });

interface SupplierFull {
  id: string;
  ragioneSociale: string;
  paese: string;
  isPersonaFisica: boolean;
  nome?: string | null;
  sesso?: string | null;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  iban?: string | null;
  valuta: string;
  gruppoIva?: string | null;
  naturaGiuridica?: string | null;
  viesRegistered?: boolean;
  partitaIvaExtraUe?: string | null;
  indirizzo?: string | null;
  cap?: string | null;
  citta?: string | null;
  provincia?: string | null;
  emailAziendale?: string | null;
  pec?: string | null;
  telefono?: string | null;
  sitoWeb?: string | null;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  registrationSource: 'self' | 'invite';
  approvedAt?: string | null;
  createdAt: string;
}

function SupplierDetailPage() {
  const { id } = useParams({ from: '/admin/fornitori/$id' });
  const [tab, setTab] = useState<'societa' | 'contatti' | 'categorie' | 'certificati'>('societa');

  const supplierQ = useQuery<SupplierFull>({
    queryKey: ['admin', 'supplier', id],
    queryFn: async () => (await api.get(`/admin/suppliers/${id}`)).data,
  });
  const usersQ = useQuery<any[]>({
    queryKey: ['admin', 'supplier', id, 'users'],
    queryFn: async () => (await api.get(`/admin/suppliers/${id}/users`)).data,
  });

  if (supplierQ.isLoading) return <p className="text-sm text-gray-500">Caricamento…</p>;
  if (!supplierQ.data) return <p className="text-sm text-red-600">Fornitore non trovato.</p>;

  const s = supplierQ.data;
  const user = usersQ.data?.[0];

  return (
    <div className="space-y-4">
      <Link to="/admin/fornitori-pending" className="text-sm text-cyan-700 hover:underline">
        ← Torna alla lista fornitori
      </Link>
      <PageHeader
        title={s.ragioneSociale}
        description={
          <span>
            Stato: <StatusBadge s={s.approvalStatus} /> · Origine:{' '}
            {s.registrationSource === 'self' ? 'Self-service' : 'Invito'} · Creato:{' '}
            {fmtDate(s.createdAt)}
            {user && (
              <>
                {' · '}Email login: <strong>{user.email}</strong>
              </>
            )}
          </span>
        }
      />

      <div className="border-b flex flex-wrap gap-1">
        <TabButton active={tab === 'societa'} onClick={() => setTab('societa')}>
          Società
        </TabButton>
        <TabButton active={tab === 'contatti'} onClick={() => setTab('contatti')}>
          Contatti
        </TabButton>
        <TabButton active={tab === 'categorie'} onClick={() => setTab('categorie')}>
          Categorie
        </TabButton>
        <TabButton active={tab === 'certificati'} onClick={() => setTab('certificati')}>
          Certificati
        </TabButton>
      </div>

      {tab === 'societa' && <SocietaTab s={s} />}
      {tab === 'contatti' && <ContattiTab id={id} />}
      {tab === 'categorie' && <CategorieTab id={id} />}
      {tab === 'certificati' && <CertificatiTab id={id} />}
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px ${
        active
          ? 'border-cyan-700 text-cyan-800 font-medium'
          : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function SocietaTab({ s }: { s: SupplierFull }) {
  const rows: [string, React.ReactNode][] = [
    ['Persona fisica', s.isPersonaFisica ? 'Sì' : 'No'],
    [s.isPersonaFisica ? 'Cognome' : 'Ragione sociale', s.ragioneSociale],
    ...(s.isPersonaFisica ? ([['Nome', s.nome ?? '—']] as [string, React.ReactNode][]) : []),
    ['Natura giuridica', s.naturaGiuridica ?? '—'],
    ['Paese', s.paese],
    ['Codice fiscale', s.codiceFiscale ?? '—'],
    ['Partita IVA', s.partitaIva ?? '—'],
    ['Registrata VIES', s.viesRegistered ? 'Sì' : 'No'],
    ['P.IVA extra-UE', s.partitaIvaExtraUe ?? '—'],
    ['Gruppo IVA', s.gruppoIva ?? '—'],
    ['Valuta', s.valuta],
    ['Indirizzo', s.indirizzo ?? '—'],
    ['CAP', s.cap ?? '—'],
    ['Città', s.citta ?? '—'],
    ['Provincia', s.provincia ?? '—'],
    ['Email aziendale', s.emailAziendale ?? '—'],
    ['PEC', s.pec ?? '—'],
    ['Telefono', s.telefono ?? '—'],
    ['Sito web', s.sitoWeb ?? '—'],
    ['IBAN', s.iban ?? '—'],
  ];
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <dl className="divide-y">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-2.5 text-sm">
            <dt className="text-gray-500">{k}</dt>
            <dd className="sm:col-span-2 font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ContattiTab({ id }: { id: string }) {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'supplier', id, 'contacts'],
    queryFn: async () => (await api.get(`/admin/suppliers/${id}/contacts`)).data,
  });
  if (isLoading) return <p className="text-sm text-gray-500">Caricamento…</p>;
  if (data.length === 0)
    return (
      <p className="text-sm text-gray-500 bg-white p-6 rounded border text-center">
        Nessun contatto.
      </p>
    );
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left font-medium px-4 py-2">Nome</th>
            <th className="text-left font-medium px-4 py-2">Ruolo</th>
            <th className="text-left font-medium px-4 py-2">Email</th>
            <th className="text-left font-medium px-4 py-2">Telefono</th>
            <th className="text-left font-medium px-4 py-2">Cellulare</th>
            <th className="text-left font-medium px-4 py-2">Principale</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-2 font-medium">
                {c.nome} {c.cognome}
              </td>
              <td className="px-4 py-2 text-gray-600">{c.ruolo ?? '—'}</td>
              <td className="px-4 py-2 text-gray-600 break-all">{c.email ?? '—'}</td>
              <td className="px-4 py-2 text-gray-600">{c.telefono ?? '—'}</td>
              <td className="px-4 py-2 text-gray-600">{c.cellulare ?? '—'}</td>
              <td className="px-4 py-2">{c.isMain ? 'Sì' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategorieTab({ id }: { id: string }) {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'supplier', id, 'categories'],
    queryFn: async () => (await api.get(`/admin/suppliers/${id}/categories`)).data,
  });
  if (isLoading) return <p className="text-sm text-gray-500">Caricamento…</p>;
  if (data.length === 0)
    return (
      <p className="text-sm text-gray-500 bg-white p-6 rounded border text-center">
        Nessuna categoria assegnata.
      </p>
    );
  return (
    <div className="bg-white rounded-lg border shadow-sm divide-y">
      {data.map((c) => (
        <div key={c.id} className="px-4 py-2.5 text-sm flex items-center gap-2">
          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
            {c.code}
          </span>
          <span>{c.name}</span>
          {!c.active && (
            <span className="text-[10px] uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
              Disattivata
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function CertificatiTab({ id }: { id: string }) {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'supplier', id, 'certs'],
    queryFn: async () => (await api.get(`/admin/suppliers/${id}/certificates`)).data,
  });
  const { data: types = [] } = useQuery<any[]>({
    queryKey: ['admin', 'cert-types-all'],
    queryFn: async () => (await api.get('/admin/certificate-types?all=1')).data,
  });
  const typeById = new Map(types.map((t) => [t.id, t]));
  if (isLoading) return <p className="text-sm text-gray-500">Caricamento…</p>;
  if (data.length === 0)
    return (
      <p className="text-sm text-gray-500 bg-white p-6 rounded border text-center">
        Nessun certificato.
      </p>
    );
  const open = async (cid: string) => {
    const r = await api.get(`/admin/suppliers/${id}/certificates/${cid}/download-url`);
    if (r.data?.url) window.open(r.data.url, '_blank', 'noopener,noreferrer');
  };
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left font-medium px-4 py-2">Tipologia</th>
            <th className="text-left font-medium px-4 py-2">Nome / numero</th>
            <th className="text-left font-medium px-4 py-2">Emissione</th>
            <th className="text-left font-medium px-4 py-2">Scadenza</th>
            <th className="text-left font-medium px-4 py-2">Stato</th>
            <th className="text-left font-medium px-4 py-2">File</th>
            <th className="text-right font-medium px-4 py-2">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => {
            const t = typeById.get(c.typeId);
            return (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-2 text-gray-800">{t?.name ?? '—'}</td>
              <td className="px-4 py-2 font-medium">
                {c.nomeAlternativo ?? c.numero ?? '—'}
              </td>
              <td className="px-4 py-2 text-gray-600">{fmtDate(c.dataEmissione)}</td>
              <td className="px-4 py-2 text-gray-600">{fmtDate(c.dataScadenza)}</td>
              <td className="px-4 py-2">
                <CertBadge status={c.status} />
              </td>
              <td className="px-4 py-2 text-gray-600 truncate max-w-[240px]">
                {c.documentFilename}
              </td>
              <td className="px-4 py-2 text-right">
                <SecondaryButton
                  type="button"
                  className="!min-h-[36px] !py-1"
                  onClick={() => open(c.id)}
                >
                  Scarica
                </SecondaryButton>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ s }: { s: 'pending' | 'approved' | 'rejected' }) {
  const map = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  } as const;
  const lbl = { pending: 'In attesa', approved: 'Approvato', rejected: 'Rifiutato' }[s];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${map[s]}`}>
      {lbl}
    </span>
  );
}

function CertBadge({ status }: { status: CertificateStatus }) {
  const map: Record<CertificateStatus, { label: string; cls: string }> = {
    [CertificateStatus.VALID]: { label: 'Valido', cls: 'bg-green-100 text-green-800 border-green-200' },
    [CertificateStatus.EXPIRING_60]: { label: '≤ 60g', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    [CertificateStatus.EXPIRING_30]: { label: '≤ 30g', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
    [CertificateStatus.EXPIRING_7]: { label: '≤ 7g', cls: 'bg-orange-100 text-orange-800 border-orange-300' },
    [CertificateStatus.EXPIRED]: { label: 'Scaduto', cls: 'bg-red-100 text-red-800 border-red-200' },
    [CertificateStatus.NO_EXPIRY]: { label: 'No scadenza', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
    [CertificateStatus.INVALID]: { label: 'Non valido', cls: 'bg-red-100 text-red-800 border-red-200' },
  };
  const m = map[status] ?? map[CertificateStatus.VALID];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${m.cls}`}>
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
