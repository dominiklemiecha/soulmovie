import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CertificateStatus } from '@soulmovie/shared';
import axios from 'axios';
import { api } from '@/lib/api';
import {
  DangerButton,
  FieldError,
  FieldLabel,
  Input,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/components/Field';

export const Route = createFileRoute('/app/certificati')({ component: CertificatiPage });

interface CertType {
  id: string;
  code: string;
  name: string;
  requiresExpiry: boolean;
}
interface Certificate {
  id: string;
  typeId: string;
  nomeAlternativo: string | null;
  numero: string | null;
  dataEmissione: string | null;
  dataScadenza: string | null;
  emittente: string | null;
  ambito: string | null;
  descrizione: string | null;
  notifyEmails: string[];
  documentFilename: string;
  documentMime: string;
  documentSize: string;
  status: CertificateStatus;
}

const STATUS_LABEL: Record<CertificateStatus, { label: string; cls: string }> = {
  [CertificateStatus.VALID]: { label: 'Valido', cls: 'bg-green-100 text-green-800 border-green-200' },
  [CertificateStatus.EXPIRING_60]: { label: 'Scade in ≤ 60g', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  [CertificateStatus.EXPIRING_30]: { label: 'Scade in ≤ 30g', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
  [CertificateStatus.EXPIRING_7]: { label: 'Scade in ≤ 7g', cls: 'bg-orange-100 text-orange-800 border-orange-300' },
  [CertificateStatus.EXPIRED]: { label: 'Scaduto', cls: 'bg-red-100 text-red-800 border-red-200' },
  [CertificateStatus.NO_EXPIRY]: { label: 'Senza scadenza', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  [CertificateStatus.INVALID]: { label: 'Non valido', cls: 'bg-red-100 text-red-800 border-red-200' },
};

function CertificatiPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<Certificate[]>({
    queryKey: ['certificates'],
    queryFn: async () => (await api.get('/suppliers/me/certificates')).data,
  });
  const { data: types = [] } = useQuery<CertType[]>({
    queryKey: ['cert-types'],
    queryFn: async () => (await api.get('/certificate-types')).data,
  });
  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Certificate | null>(null);

  const removeMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/suppliers/me/certificates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificates'] });
      setConfirmDelete(null);
    },
  });

  const openDownload = async (id: string) => {
    const r = await api.get(`/suppliers/me/certificates/${id}/download-url`);
    window.open(r.data.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Certificati"
        description="Carica i certificati richiesti. Verrai avvisato via email all'avvicinarsi della scadenza."
        actions={
          <PrimaryButton type="button" onClick={() => setAdding(true)}>
            + Carica certificato
          </PrimaryButton>
        }
      />

      {isLoading && <p className="text-sm text-gray-500">Caricamento…</p>}
      {!isLoading && items.length === 0 && (
        <div className="rounded border bg-white p-6 text-center text-sm text-gray-500">
          Nessun certificato ancora caricato.
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {items.map((c) => (
          <article key={c.id} className="bg-white rounded-lg border p-4 shadow-sm">
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {typeById.get(c.typeId)?.name ?? '—'}
                </h3>
                {c.numero && (
                  <p className="text-xs text-gray-500">N° {c.numero}</p>
                )}
              </div>
              <StatusBadge status={c.status} />
            </header>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <dt className="text-gray-400">Emissione</dt>
                <dd>{fmtDate(c.dataEmissione)}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Scadenza</dt>
                <dd>{fmtDate(c.dataScadenza)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-400">File</dt>
                <dd className="truncate">{c.documentFilename}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <SecondaryButton type="button" onClick={() => openDownload(c.id)}>
                Scarica
              </SecondaryButton>
              <SecondaryButton
                type="button"
                onClick={() => setConfirmDelete(c)}
                className="!text-red-700 !border-red-200 hover:!bg-red-50"
              >
                Elimina
              </SecondaryButton>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-2">Tipologia</th>
                <th className="text-left font-medium px-4 py-2">Numero</th>
                <th className="text-left font-medium px-4 py-2">Emissione</th>
                <th className="text-left font-medium px-4 py-2">Scadenza</th>
                <th className="text-left font-medium px-4 py-2">Stato</th>
                <th className="text-left font-medium px-4 py-2">File</th>
                <th className="text-right font-medium px-4 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{typeById.get(c.typeId)?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{c.numero ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{fmtDate(c.dataEmissione)}</td>
                  <td className="px-4 py-2 text-gray-600">{fmtDate(c.dataScadenza)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-600 truncate max-w-[240px]">
                    {c.documentFilename}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <SecondaryButton
                        type="button"
                        onClick={() => openDownload(c.id)}
                        className="!min-h-[36px] !py-1"
                      >
                        Scarica
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => setConfirmDelete(c)}
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

      {adding && (
        <UploadModal
          types={types}
          onClose={() => setAdding(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['certificates'] });
            setAdding(false);
          }}
        />
      )}
      {confirmDelete && (
        <Shell title="Eliminare certificato?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-gray-700">
            Eliminare il certificato "{confirmDelete.documentFilename}"? L'azione è irreversibile.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <SecondaryButton type="button" onClick={() => setConfirmDelete(null)}>
              Annulla
            </SecondaryButton>
            <DangerButton
              type="button"
              disabled={removeMut.isPending}
              onClick={() => removeMut.mutate(confirmDelete.id)}
            >
              {removeMut.isPending ? 'Eliminazione…' : 'Elimina'}
            </DangerButton>
          </div>
        </Shell>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CertificateStatus }) {
  const s = STATUS_LABEL[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${s.cls}`}>
      {s.label}
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

function UploadModal({
  types,
  onClose,
  onSaved,
}: {
  types: CertType[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string>(types[0]?.id ?? '');
  const [nomeAlternativo, setNomeAlternativo] = useState('');
  const [dataEmissione, setDataEmissione] = useState('');
  const [dataScadenza, setDataScadenza] = useState('');
  const [emittente, setEmittente] = useState('');
  const [numero, setNumero] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [notifyEmailsRaw, setNotifyEmailsRaw] = useState('');

  const selectedType = types.find((t) => t.id === typeId);

  useEffect(() => {
    if (!typeId && types.length > 0) setTypeId(types[0].id);
  }, [types, typeId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!typeId) {
      setServerError('Seleziona una tipologia');
      return;
    }
    if (!file) {
      setServerError('Seleziona un file');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setServerError('Il file supera 25 MB');
      return;
    }
    if (selectedType?.requiresExpiry && !dataScadenza) {
      setServerError('Data "Valido fino a" obbligatoria per questa tipologia');
      return;
    }
    try {
      setStage('uploading');
      const presign = await api.post('/suppliers/me/certificates/upload-url', {
        filename: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
      });
      await axios.put(presign.data.url, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      setStage('saving');
      await api.post('/suppliers/me/certificates', {
        typeId,
        nomeAlternativo: nomeAlternativo || null,
        numero: numero || null,
        dataEmissione: dataEmissione || null,
        dataScadenza: dataScadenza || null,
        emittente: emittente || null,
        descrizione: descrizione || null,
        notifyEmails: notifyEmailsRaw,
        documentObjectKey: presign.data.objectKey,
        documentFilename: file.name,
        documentMime: file.type || 'application/octet-stream',
        documentSize: file.size,
      });
      onSaved();
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? e.message ?? 'Errore upload');
      setStage('idle');
    }
  };

  return (
    <Shell title="Nuovo certificato" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FieldLabel>Seleziona certificato *</FieldLabel>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm bg-white min-h-[44px]"
            >
              <option value="">— Seleziona —</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.requiresExpiry ? '* ' : ''}
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              I certificati con * richiedono data di scadenza.
            </p>
          </div>

          <div className="sm:col-span-2">
            <FieldLabel>Nome alternativo</FieldLabel>
            <Input
              maxLength={120}
              value={nomeAlternativo}
              onChange={(e) => setNomeAlternativo(e.target.value)}
              placeholder="Etichetta facoltativa per identificare il certificato"
            />
          </div>

          <div>
            <FieldLabel>
              Valido fino a {selectedType?.requiresExpiry ? '*' : '(opz.)'}
            </FieldLabel>
            <Input
              type="date"
              value={dataScadenza}
              onChange={(e) => setDataScadenza(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Data emissione</FieldLabel>
            <Input
              type="date"
              value={dataEmissione}
              onChange={(e) => setDataEmissione(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Numero</FieldLabel>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Autorità di certificazione</FieldLabel>
            <Input
              value={emittente}
              onChange={(e) => setEmittente(e.target.value)}
              placeholder="es. CCIAA di Roma"
            />
          </div>

          <div className="sm:col-span-2">
            <FieldLabel>Descrizione</FieldLabel>
            <Input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <FieldLabel>
              Informa le persone seguenti (email separate da virgola)
            </FieldLabel>
            <textarea
              value={notifyEmailsRaw}
              onChange={(e) => setNotifyEmailsRaw(e.target.value)}
              rows={2}
              placeholder="es. responsabile@azienda.it, qualita@azienda.it"
              className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Riceveranno gli alert di scadenza a 60/30/7 giorni e a scadenza avvenuta.
            </p>
          </div>

          <div className="sm:col-span-2">
            <FieldLabel>Documento di certificazione * (max 25 MB)</FieldLabel>
            <input
              type="file"
              accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm border border-gray-300 rounded p-2 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-cyan-50 file:text-cyan-700"
            />
            {file && (
              <p className="text-xs text-gray-500 mt-1">
                {file.name} — {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={stage !== 'idle'}>
            Annulla
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={stage !== 'idle'}>
            {stage === 'uploading'
              ? 'Caricamento file…'
              : stage === 'saving'
                ? 'Salvataggio…'
                : 'Carica certificato'}
          </PrimaryButton>
        </div>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-100 text-gray-500"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
