import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CertificateTypeCreateDto, certificateTypeCreateSchema } from '@soulmovie/shared';
import { api } from '@/lib/api';
import {
  Checkbox,
  DangerButton,
  FieldError,
  FieldLabel,
  Input,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/components/Field';

export const Route = createFileRoute('/admin/tipologie-certificati')({
  component: TipologiePage,
});

interface CertType {
  id: string;
  code: string;
  name: string;
  requiresExpiry: boolean;
  active: boolean;
}

function TipologiePage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CertType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CertType | null>(null);

  const { data = [] } = useQuery<CertType[]>({
    queryKey: ['admin', 'cert-types'],
    queryFn: async () => (await api.get('/admin/certificate-types?all=1')).data,
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/certificate-types/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'cert-types'] });
      setConfirmDelete(null);
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tipologie certificati"
        description="Catalogo gestito dall'admin. I fornitori scelgono fra queste tipologie quando caricano un certificato."
        actions={
          <PrimaryButton type="button" onClick={() => setCreating(true)}>
            + Nuova tipologia
          </PrimaryButton>
        }
      />

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-2">Codice</th>
                <th className="text-left font-medium px-4 py-2">Nome</th>
                <th className="text-left font-medium px-4 py-2">Scadenza obbl.</th>
                <th className="text-left font-medium px-4 py-2">Attiva</th>
                <th className="text-right font-medium px-4 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{t.code}</td>
                  <td className="px-4 py-2">{t.name}</td>
                  <td className="px-4 py-2">{t.requiresExpiry ? 'Sì' : 'No'}</td>
                  <td className="px-4 py-2">{t.active ? 'Sì' : 'No'}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <SecondaryButton
                        type="button"
                        onClick={() => setEditing(t)}
                        className="!min-h-[36px] !py-1"
                      >
                        Modifica
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => setConfirmDelete(t)}
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

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'cert-types'] });
            setCreating(false);
          }}
        />
      )}
      {editing && (
        <EditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'cert-types'] });
            setEditing(null);
          }}
        />
      )}
      {confirmDelete && (
        <Confirm
          title="Eliminare tipologia?"
          message={`Eliminare ${confirmDelete.code}? Possibile solo se non è usata da nessun certificato.`}
          submitting={removeMut.isPending}
          error={(removeMut.error as any)?.response?.data?.error?.message}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeMut.mutate(confirmDelete.id)}
        />
      )}
    </div>
  );
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CertificateTypeCreateDto>({
    resolver: zodResolver(certificateTypeCreateSchema),
    defaultValues: { code: '', name: '', requiresExpiry: true, active: true },
  });

  const onSubmit = handleSubmit(async (dto) => {
    setServerError(null);
    try {
      await api.post('/admin/certificate-types', dto);
      onSaved();
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Errore');
    }
  });

  return (
    <Shell title="Nuova tipologia certificato" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Codice *</FieldLabel>
            <Input invalid={!!errors.code} {...register('code')} />
            <FieldError>{errors.code?.message}</FieldError>
          </div>
          <div>
            <FieldLabel>Nome *</FieldLabel>
            <Input invalid={!!errors.name} {...register('name')} />
            <FieldError>{errors.name?.message}</FieldError>
          </div>
          <div>
            <Checkbox label="Richiede data di scadenza" {...register('requiresExpiry')} />
          </div>
          <div>
            <Checkbox label="Attiva" {...register('active')} />
          </div>
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Annulla
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio…' : 'Crea'}
          </PrimaryButton>
        </div>
      </form>
    </Shell>
  );
}

function EditModal({
  item,
  onClose,
  onSaved,
}: {
  item: CertType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [requiresExpiry, setRequiresExpiry] = useState(item.requiresExpiry);
  const [active, setActive] = useState(item.active);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSubmitting(true);
    try {
      await api.patch(`/admin/certificate-types/${item.id}`, { name, requiresExpiry, active });
      onSaved();
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Errore');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell title={`Modifica ${item.code}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Codice (read-only)</FieldLabel>
            <Input value={item.code} disabled />
          </div>
          <div>
            <FieldLabel>Nome *</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Checkbox
              label="Richiede data di scadenza"
              checked={requiresExpiry}
              onChange={(e) => setRequiresExpiry(e.target.checked)}
            />
          </div>
          <div>
            <Checkbox
              label="Attiva"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
          </div>
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Annulla
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Salvataggio…' : 'Salva'}
          </PrimaryButton>
        </div>
      </form>
    </Shell>
  );
}

function Confirm({
  title,
  message,
  onCancel,
  onConfirm,
  submitting,
  error,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
  error?: string;
}) {
  return (
    <Shell title={title} onClose={onCancel}>
      <p className="text-sm text-gray-700">{message}</p>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <SecondaryButton type="button" onClick={onCancel}>
          Annulla
        </SecondaryButton>
        <DangerButton type="button" disabled={submitting} onClick={onConfirm}>
          {submitting ? 'Eliminazione…' : 'Elimina'}
        </DangerButton>
      </div>
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
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
