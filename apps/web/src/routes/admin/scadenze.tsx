import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CertificateStatus } from '@soulmovie/shared';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/download';
import { PageHeader } from '@/components/Field';

type WindowSel = 'expired' | '7' | '30' | '60' | 'all';
export const Route = createFileRoute('/admin/scadenze')({
  validateSearch: (s: Record<string, unknown>): { window?: WindowSel } => {
    const v = String(s.window ?? '');
    if (['expired', '7', '30', '60', 'all'].includes(v)) return { window: v as WindowSel };
    return {};
  },
  component: ScadenzePage,
});

interface Row {
  id: string;
  supplierId: string;
  nomeAlternativo: string | null;
  numero: string | null;
  dataEmissione: string | null;
  dataScadenza: string | null;
  documentFilename: string;
  status: CertificateStatus;
  supplier: { id: string; ragioneSociale: string; partitaIva?: string | null };
  type: { code: string; name: string; requiresExpiry: boolean };
}

function ScadenzePage() {
  const search = Route.useSearch();
  const [windowSel, setWindowSel] = useState<WindowSel>(search.window ?? 'all');
  useEffect(() => {
    if (search.window) setWindowSel(search.window);
  }, [search.window]);
  const [q, setQ] = useState('');
  const [qDeb, setQDeb] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useQuery<{ items: Row[]; total: number }>({
    queryKey: ['admin', 'certificates', windowSel, qDeb],
    queryFn: async () =>
      (
        await api.get('/admin/certificates', {
          params: { window: windowSel, q: qDeb || undefined, pageSize: 200 },
        })
      ).data,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Scadenze documenti"
        description="Vista trasversale dei certificati di tutti i fornitori, ordinati per scadenza."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                '/admin/export/certificates.csv',
                { window: windowSel, q: qDeb || undefined },
                'certificati.csv',
              )
            }
            className="inline-flex items-center justify-center min-h-[36px] px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-medium hover:bg-gray-50"
          >
            ⬇ Esporta CSV
          </button>
        }
      />
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca fornitore o tipologia…"
          className="w-full sm:max-w-md rounded border border-gray-300 px-3 py-2.5 text-sm bg-white min-h-[44px]"
        />
        <div className="flex flex-wrap gap-2">
          {(['expired', '7', '30', '60', 'all'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindowSel(w)}
              className={`px-3 py-1.5 rounded text-xs font-medium border min-h-[36px] ${
                windowSel === w
                  ? 'bg-cyan-700 text-white border-cyan-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {labelWindow(w)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Caricamento…</p>}
      {!isLoading && items.length === 0 && (
        <div className="rounded border bg-white p-6 text-center text-sm text-gray-500">
          Nessun certificato in questa finestra.
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {items.map((c) => (
          <article key={c.id} className="bg-white rounded-lg border p-4 shadow-sm">
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  <Link
                    to={`/admin/fornitori/${c.supplier.id}`}
                    className="text-cyan-800 hover:underline"
                  >
                    {c.supplier.ragioneSociale}
                  </Link>
                </h3>
                <p className="text-xs text-gray-500 truncate">{c.type.name}</p>
              </div>
              <CertBadge status={c.status} />
            </header>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <dt className="text-gray-400">Scadenza</dt>
                <dd>{fmtDate(c.dataScadenza)}</dd>
              </div>
              <div>
                <dt className="text-gray-400">P.IVA</dt>
                <dd>{c.supplier.partitaIva ?? '—'}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-2">Fornitore</th>
                <th className="text-left font-medium px-4 py-2">Tipologia</th>
                <th className="text-left font-medium px-4 py-2">Etichetta</th>
                <th className="text-left font-medium px-4 py-2">Scadenza</th>
                <th className="text-left font-medium px-4 py-2">Stato</th>
                <th className="text-left font-medium px-4 py-2">P.IVA</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      to={`/admin/fornitori/${c.supplier.id}`}
                      className="text-cyan-800 hover:underline"
                    >
                      {c.supplier.ragioneSociale}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.type.name}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {c.nomeAlternativo ?? c.numero ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{fmtDate(c.dataScadenza)}</td>
                  <td className="px-4 py-2">
                    <CertBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.supplier.partitaIva ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function labelWindow(w: 'expired' | '7' | '30' | '60' | 'all') {
  return w === 'expired'
    ? 'Già scaduti'
    : w === '7'
      ? 'Entro 7g'
      : w === '30'
        ? 'Entro 30g'
        : w === '60'
          ? 'Entro 60g'
          : 'Tutti';
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

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('it-IT');
  } catch {
    return d;
  }
}
