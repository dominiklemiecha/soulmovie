import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/download';
import {
  DangerButton,
  FieldError,
  FieldLabel,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Textarea,
} from '@/components/Field';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';
export const Route = createFileRoute('/admin/fornitori-pending')({
  validateSearch: (s: Record<string, unknown>): { status?: StatusFilter } => {
    const v = String(s.status ?? '');
    if (['pending', 'approved', 'rejected', 'all'].includes(v))
      return { status: v as StatusFilter };
    return {};
  },
  component: PendingPage,
});

interface SupplierRow {
  id: string;
  ragioneSociale: string;
  emailAziendale?: string | null;
  userEmail?: string | null;
  partitaIva?: string | null;
  codiceFiscale?: string | null;
  indirizzo?: string | null;
  citta?: string | null;
  registrationSource: 'self' | 'invite';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

function isApproveReady(s: SupplierRow): boolean {
  return !!(s.partitaIva || s.codiceFiscale) && !!s.indirizzo && !!s.citta;
}

function PendingPage() {
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(search.status ?? 'all');
  useEffect(() => {
    if (search.status) setStatusFilter(search.status);
  }, [search.status]);
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(id);
  }, [q]);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'suppliers', statusFilter, qDebounced],
    queryFn: async () =>
      (
        await api.get('/admin/suppliers', {
          params: { status: statusFilter, pageSize: 100, q: qDebounced || undefined },
        })
      ).data,
  });
  const items: SupplierRow[] = data?.items ?? [];

  const approve = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/suppliers/${id}/approve`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] }),
  });
  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post(`/admin/suppliers/${id}/reject`, { reason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
      setRejectingId(null);
    },
  });
  const disableMut = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/suppliers/${id}/disable`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] }),
  });
  const reactivateMut = useMutation({
    mutationFn: async (id: string) => (await api.post(`/admin/suppliers/${id}/reactivate`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] }),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/suppliers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
      setDeleting(null);
    },
  });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SupplierRow | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Fornitori"
        description="Gestione delle richieste di registrazione e dello stato di approvazione."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                '/admin/export/suppliers.csv',
                {
                  status: statusFilter === 'all' ? undefined : statusFilter,
                  q: qDebounced || undefined,
                },
                'fornitori.csv',
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
          placeholder="Cerca per ragione sociale, P.IVA, codice fiscale, città…"
          className="w-full sm:max-w-md rounded border border-gray-300 px-3 py-2.5 text-sm bg-white min-h-[44px]"
        />
        <div className="flex flex-wrap gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded text-xs font-medium border min-h-[36px] ${
                statusFilter === s
                  ? 'bg-cyan-700 text-white border-cyan-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {labelForStatus(s)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Caricamento…</p>}
      {!isLoading && items.length === 0 && (
        <div className="rounded border bg-white p-6 text-center text-sm text-gray-500">
          Nessun fornitore in questa lista.
        </div>
      )}

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2">
        {items.map((s) => (
          <article key={s.id} className="bg-white rounded-lg border p-4 shadow-sm">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm">
                  <Link
                    to={`/admin/fornitori/${s.id}`}
                    className="text-cyan-800 hover:underline"
                  >
                    {s.ragioneSociale}
                  </Link>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{s.emailAziendale ?? s.userEmail ?? '—'}</p>
              </div>
              <StatusBadge status={s.approvalStatus} />
            </header>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <dt className="text-gray-400">P.IVA</dt>
                <dd>{s.partitaIva ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Città</dt>
                <dd>{s.citta ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Origine</dt>
                <dd>{s.registrationSource === 'self' ? 'Self' : 'Invito'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Creato</dt>
                <dd>{new Date(s.createdAt).toLocaleDateString('it-IT')}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-col gap-2">
              {s.approvalStatus === 'pending' && (
                <>
                  <PrimaryButton
                    type="button"
                    onClick={() => approve.mutate(s.id)}
                    disabled={approve.isPending || !isApproveReady(s)}
                    title={!isApproveReady(s) ? 'Profilo incompleto: mancano P.IVA o sede' : undefined}
                  >
                    Approva
                  </PrimaryButton>
                  <SecondaryButton type="button" onClick={() => setRejectingId(s.id)}>
                    Rifiuta
                  </SecondaryButton>
                </>
              )}
              {s.approvalStatus === 'approved' && (
                <SecondaryButton
                  type="button"
                  onClick={() => disableMut.mutate(s.id)}
                  disabled={disableMut.isPending}
                >
                  Disattiva
                </SecondaryButton>
              )}
              {(s.approvalStatus === 'rejected' || s.approvalStatus === 'pending') && (
                <SecondaryButton
                  type="button"
                  onClick={() => reactivateMut.mutate(s.id)}
                  disabled={reactivateMut.isPending}
                >
                  Riattiva
                </SecondaryButton>
              )}
              <SecondaryButton
                type="button"
                onClick={() => setDeleting(s)}
                className="!text-red-700 !border-red-200 hover:!bg-red-50"
              >
                Elimina
              </SecondaryButton>
            </div>
          </article>
        ))}
      </div>

      {/* Tablet/desktop: table */}
      <div className="hidden md:block bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-2">Ragione sociale</th>
                <th className="text-left font-medium px-4 py-2">Email</th>
                <th className="text-left font-medium px-4 py-2">P.IVA</th>
                <th className="text-left font-medium px-4 py-2">Origine</th>
                <th className="text-left font-medium px-4 py-2">Creato</th>
                <th className="text-left font-medium px-4 py-2">Stato</th>
                <th className="text-right font-medium px-4 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    <Link
                      to={`/admin/fornitori/${s.id}`}
                      className="text-cyan-800 hover:underline"
                    >
                      {s.ragioneSociale}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{s.emailAziendale ?? s.userEmail ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{s.partitaIva ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {s.registrationSource === 'self' ? 'Self' : 'Invito'}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(s.createdAt).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={s.approvalStatus} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {s.approvalStatus === 'pending' && (
                        <>
                          <PrimaryButton
                            type="button"
                            onClick={() => approve.mutate(s.id)}
                            disabled={approve.isPending || !isApproveReady(s)}
                            title={!isApproveReady(s) ? 'Profilo incompleto: mancano P.IVA o sede' : undefined}
                            className="!min-h-[36px] !py-1"
                          >
                            Approva
                          </PrimaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={() => setRejectingId(s.id)}
                            className="!min-h-[36px] !py-1"
                          >
                            Rifiuta
                          </SecondaryButton>
                        </>
                      )}
                      {s.approvalStatus === 'approved' && (
                        <SecondaryButton
                          type="button"
                          onClick={() => disableMut.mutate(s.id)}
                          disabled={disableMut.isPending}
                          className="!min-h-[36px] !py-1"
                        >
                          Disattiva
                        </SecondaryButton>
                      )}
                      {s.approvalStatus === 'rejected' && (
                        <SecondaryButton
                          type="button"
                          onClick={() => reactivateMut.mutate(s.id)}
                          disabled={reactivateMut.isPending}
                          className="!min-h-[36px] !py-1"
                        >
                          Riattiva
                        </SecondaryButton>
                      )}
                      <SecondaryButton
                        type="button"
                        onClick={() => setDeleting(s)}
                        className="!min-h-[36px] !py-1 !text-red-700 !border-red-200 hover:!bg-red-50"
                      >
                        Elimina
                      </SecondaryButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectingId && (
        <RejectModal
          onCancel={() => setRejectingId(null)}
          onConfirm={(reason) => reject.mutate({ id: rejectingId, reason })}
          submitting={reject.isPending}
          error={(reject.error as any)?.response?.data?.error?.message}
        />
      )}
      {deleting && (
        <DeleteSupplierModal
          supplier={deleting}
          submitting={deleteMut.isPending}
          error={(deleteMut.error as any)?.response?.data?.error?.message}
          onCancel={() => setDeleting(null)}
          onConfirm={() => deleteMut.mutate(deleting.id)}
        />
      )}
    </div>
  );
}

function DeleteSupplierModal({
  supplier,
  onCancel,
  onConfirm,
  submitting,
  error,
}: {
  supplier: SupplierRow;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
  error?: string;
}) {
  const [confirmText, setConfirmText] = useState('');
  const expected = supplier.ragioneSociale.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
        <h3 className="font-semibold text-base">Eliminare definitivamente?</h3>
        <p className="text-sm text-gray-700">
          Stai per eliminare <strong>{supplier.ragioneSociale}</strong> e <strong>tutti</strong> i
          dati collegati: account utente, contatti, categorie e certificati. L'azione è{' '}
          <strong>irreversibile</strong>.
        </p>
        <p className="text-sm text-gray-700">
          Per confermare digita la ragione sociale esatta:{' '}
          <code className="bg-gray-100 px-1 rounded">{expected}</code>
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={expected}
          className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm bg-white min-h-[44px]"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onCancel}>
            Annulla
          </SecondaryButton>
          <DangerButton
            type="button"
            disabled={submitting || confirmText.trim() !== expected}
            onClick={onConfirm}
          >
            {submitting ? 'Eliminazione…' : 'Elimina definitivamente'}
          </DangerButton>
        </div>
      </div>
    </div>
  );
}

function labelForStatus(s: 'pending' | 'approved' | 'rejected' | 'all') {
  return s === 'pending' ? 'In attesa' : s === 'approved' ? 'Approvati' : s === 'rejected' ? 'Rifiutati' : 'Tutti';
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const map = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  } as const;
  const lbl = { pending: 'In attesa', approved: 'Approvato', rejected: 'Rifiutato' }[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${map[status]}`}>
      {lbl}
    </span>
  );
}

function RejectModal({
  onCancel,
  onConfirm,
  submitting,
  error,
}: {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
  error?: string;
}) {
  const [reason, setReason] = useState('');
  const tooShort = reason.trim().length < 3;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
        <h3 className="font-semibold text-base">Rifiuta fornitore</h3>
        <div>
          <FieldLabel>Motivazione (visibile al fornitore)</FieldLabel>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Es. dati anagrafici incompleti o non corretti."
          />
          <FieldError>{tooShort ? 'Inserisci almeno 3 caratteri.' : undefined}</FieldError>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onCancel}>
            Annulla
          </SecondaryButton>
          <DangerButton
            type="button"
            disabled={submitting || tooShort}
            onClick={() => onConfirm(reason.trim())}
          >
            {submitting ? 'Invio…' : 'Conferma rifiuto'}
          </DangerButton>
        </div>
      </div>
    </div>
  );
}
