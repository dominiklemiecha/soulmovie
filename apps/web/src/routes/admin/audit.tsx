import { createFileRoute } from '@tanstack/react-router';
import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/Field';

export const Route = createFileRoute('/admin/audit')({ component: AuditPage });

interface Row {
  id: string;
  userId: string | null;
  userEmail: string | null;
  supplierId: string | null;
  supplierName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: any;
  after: any;
  createdAt: string;
}

const ACTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tutte le azioni' },
  { value: 'supplier.update', label: 'Modifica anagrafica fornitore' },
  { value: 'supplier.approve', label: 'Approvazione fornitore' },
  { value: 'supplier.reject', label: 'Rifiuto fornitore' },
  { value: 'contact.create', label: 'Aggiunta contatto' },
  { value: 'contact.update', label: 'Modifica contatto' },
  { value: 'contact.delete', label: 'Eliminazione contatto' },
  { value: 'certificate.create', label: 'Caricamento certificato' },
  { value: 'certificate.update', label: 'Modifica certificato' },
  { value: 'certificate.delete', label: 'Eliminazione certificato' },
  { value: 'category.create', label: 'Creazione categoria' },
  { value: 'category.update', label: 'Modifica categoria' },
  { value: 'category.delete', label: 'Eliminazione categoria' },
  { value: 'supplier.categories.set', label: 'Aggiornamento categorie fornitore' },
];

function AuditPage() {
  const [actionSel, setActionSel] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actorDeb, setActorDeb] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setActorDeb(actorFilter), 300);
    return () => clearTimeout(t);
  }, [actorFilter]);

  const { data, isLoading } = useQuery<{ items: Row[]; total: number }>({
    queryKey: ['admin', 'audit', actionSel],
    queryFn: async () =>
      (
        await api.get('/admin/audit', {
          params: { action: actionSel || undefined, pageSize: 500 },
        })
      ).data,
  });

  const items = (data?.items ?? []).filter((r) => {
    if (!actorDeb) return true;
    const q = actorDeb.toLowerCase();
    return (
      (r.userEmail ?? '').toLowerCase().includes(q) ||
      (r.supplierName ?? '').toLowerCase().includes(q)
    );
  });

  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Storico attività"
        description={`Tutte le modifiche fatte da utenti e amministratori. ${data?.total ?? 0} eventi totali.`}
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={actionSel}
          onChange={(e) => setActionSel(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2.5 text-sm bg-white min-h-[44px]"
        >
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <input
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          placeholder="Filtra per utente o fornitore…"
          className="w-full sm:max-w-sm rounded border border-gray-300 px-3 py-2.5 text-sm bg-white min-h-[44px]"
        />
      </div>

      {isLoading && <p className="text-sm text-gray-500">Caricamento…</p>}
      {!isLoading && items.length === 0 && (
        <div className="rounded border bg-white p-6 text-center text-sm text-gray-500">
          Nessuna attività in questa selezione.
        </div>
      )}

      <div className="bg-white rounded-lg border shadow-sm divide-y">
        {items.map((r) => {
          const det = describe(r);
          return (
            <Fragment key={r.id}>
              <article className="p-4 hover:bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{det.who}</span>{' '}
                      <span>{det.what}</span>
                      {det.target && (
                        <span className="text-gray-700"> {det.target}</span>
                      )}
                    </p>
                    {det.detail && (
                      <p className="text-xs text-gray-600 mt-1">{det.detail}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {fmtDateTime(r.createdAt)}
                  </div>
                </div>
                {(r.before || r.after) && (
                  <button
                    type="button"
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                    className="mt-2 text-xs text-cyan-700 hover:underline"
                  >
                    {open === r.id ? 'Nascondi dettagli tecnici' : 'Mostra dettagli tecnici'}
                  </button>
                )}
                {open === r.id && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className="text-gray-500 uppercase mb-1">Prima</p>
                      <pre className="bg-gray-50 border rounded p-2 overflow-x-auto">
                        {r.before ? JSON.stringify(r.before, null, 2) : '—'}
                      </pre>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase mb-1">Dopo</p>
                      <pre className="bg-gray-50 border rounded p-2 overflow-x-auto">
                        {r.after ? JSON.stringify(r.after, null, 2) : '—'}
                      </pre>
                    </div>
                  </div>
                )}
              </article>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function describe(r: Row): { who: string; what: string; target?: string; detail?: string } {
  const who =
    r.userEmail === 'admin@soulmovie.local'
      ? 'Admin'
      : r.userEmail
        ? r.userEmail
        : 'Sistema';
  const sup = r.supplierName ? `"${r.supplierName}"` : '';

  switch (r.action) {
    case 'supplier.update':
      return {
        who,
        what: 'ha modificato l\'anagrafica del fornitore',
        target: sup,
        detail: summarizeFields(r.after),
      };
    case 'supplier.approve':
      return {
        who,
        what: 'ha approvato il fornitore',
        target: sup,
      };
    case 'supplier.reject':
      return {
        who,
        what: 'ha rifiutato il fornitore',
        target: sup,
        detail: r.after?.reason ? `Motivo: "${r.after.reason}"` : undefined,
      };
    case 'contact.create':
      return {
        who,
        what: 'ha aggiunto un contatto al fornitore',
        target: sup,
        detail: r.after ? `${r.after.nome ?? ''} ${r.after.cognome ?? ''}`.trim() : undefined,
      };
    case 'contact.update':
      return { who, what: 'ha modificato un contatto del fornitore', target: sup };
    case 'contact.delete':
      return {
        who,
        what: 'ha eliminato un contatto del fornitore',
        target: sup,
        detail: r.before
          ? `${r.before.nome ?? ''} ${r.before.cognome ?? ''}`.trim()
          : undefined,
      };
    case 'certificate.create':
      return {
        who,
        what: 'ha caricato un certificato per',
        target: sup,
        detail: r.after?.documentFilename ?? undefined,
      };
    case 'certificate.update':
      return { who, what: 'ha modificato un certificato di', target: sup };
    case 'certificate.delete':
      return {
        who,
        what: 'ha eliminato un certificato di',
        target: sup,
        detail: r.before?.documentFilename ?? undefined,
      };
    case 'category.create':
      return {
        who,
        what: 'ha creato la categoria merceologica',
        target: r.after?.code ? `${r.after.code} — ${r.after.name ?? ''}` : undefined,
      };
    case 'category.update':
      return { who, what: 'ha modificato una categoria merceologica' };
    case 'category.delete':
      return { who, what: 'ha eliminato una categoria merceologica' };
    case 'supplier.categories.set':
      return {
        who,
        what: 'ha aggiornato le categorie merceologiche di',
        target: sup,
        detail: Array.isArray(r.after?.categoryIds)
          ? `${r.after.categoryIds.length} categorie selezionate`
          : undefined,
      };
    default:
      return { who, what: r.action, target: r.entityType };
  }
}

function summarizeFields(after: any): string | undefined {
  if (!after || typeof after !== 'object') return undefined;
  const keys = Object.keys(after).filter((k) => after[k] != null && after[k] !== '');
  if (keys.length === 0) return undefined;
  const labels: Record<string, string> = {
    ragioneSociale: 'Ragione sociale',
    partitaIva: 'P.IVA',
    codiceFiscale: 'Codice fiscale',
    indirizzo: 'Indirizzo',
    cap: 'CAP',
    citta: 'Città',
    provincia: 'Provincia',
    paese: 'Paese',
    telefono: 'Telefono',
    pec: 'PEC',
    emailAziendale: 'Email aziendale',
    sitoWeb: 'Sito web',
    iban: 'IBAN',
    naturaGiuridica: 'Natura giuridica',
    valuta: 'Valuta',
  };
  const friendly = keys.slice(0, 6).map((k) => labels[k] ?? k);
  return `Campi modificati: ${friendly.join(', ')}${keys.length > 6 ? '…' : ''}`;
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
