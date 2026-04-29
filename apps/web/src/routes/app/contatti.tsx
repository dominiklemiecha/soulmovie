import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ContactCreateDto, contactCreateSchema } from '@soulmovie/shared';
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

export const Route = createFileRoute('/app/contatti')({ component: ContactsPage });

interface Contact extends ContactCreateDto {
  id: string;
}

function ContactsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Contact | null>(null);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => (await api.get('/suppliers/me/contacts')).data,
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/suppliers/me/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setConfirmDelete(null);
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contatti aziendali"
        description="Persone di riferimento del fornitore. Imposta un contatto come principale per dargli priorità nelle comunicazioni."
        actions={
          <PrimaryButton type="button" onClick={() => setEditing('new')}>
            + Nuovo contatto
          </PrimaryButton>
        }
      />

      {isLoading && <p className="text-sm text-gray-500">Caricamento…</p>}
      {!isLoading && contacts.length === 0 && (
        <div className="rounded border bg-white p-6 text-center text-sm text-gray-500">
          Nessun contatto. Aggiungi il primo per iniziare.
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {contacts.map((c) => (
          <article key={c.id} className="bg-white rounded-lg border p-4 shadow-sm">
            <header className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm">
                  {c.nome} {c.cognome}
                  {c.isMain && (
                    <span className="ml-2 inline-block text-[10px] uppercase tracking-wide bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded border border-cyan-200">
                      Principale
                    </span>
                  )}
                </h3>
                {c.ruolo && <p className="text-xs text-gray-500 mt-0.5">{c.ruolo}</p>}
              </div>
            </header>
            <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-gray-600">
              {c.email && (
                <div>
                  <dt className="text-gray-400 inline">Email: </dt>
                  <dd className="inline break-all">{c.email}</dd>
                </div>
              )}
              {c.telefono && (
                <div>
                  <dt className="text-gray-400 inline">Tel: </dt>
                  <dd className="inline">{c.telefono}</dd>
                </div>
              )}
              {c.cellulare && (
                <div>
                  <dt className="text-gray-400 inline">Cell: </dt>
                  <dd className="inline">{c.cellulare}</dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex gap-2">
              <SecondaryButton type="button" onClick={() => setEditing(c)}>
                Modifica
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
                <th className="text-left font-medium px-4 py-2">Nome</th>
                <th className="text-left font-medium px-4 py-2">Ruolo</th>
                <th className="text-left font-medium px-4 py-2">Email</th>
                <th className="text-left font-medium px-4 py-2">Telefono</th>
                <th className="text-left font-medium px-4 py-2">Cellulare</th>
                <th className="text-left font-medium px-4 py-2">Principale</th>
                <th className="text-right font-medium px-4 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {c.nome} {c.cognome}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{c.ruolo ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600 break-all">{c.email ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{c.telefono ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{c.cellulare ?? '—'}</td>
                  <td className="px-4 py-2">
                    {c.isMain ? (
                      <span className="inline-block text-[10px] uppercase tracking-wide bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded border border-cyan-200">
                        Sì
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <SecondaryButton
                        type="button"
                        onClick={() => setEditing(c)}
                        className="!min-h-[36px] !py-1"
                      >
                        Modifica
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

      {editing && (
        <ContactModal
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['contacts'] });
            setEditing(null);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminare contatto?"
          message={`Eliminare ${confirmDelete.nome} ${confirmDelete.cognome}? L'azione è irreversibile.`}
          submitting={removeMut.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeMut.mutate(confirmDelete.id)}
        />
      )}
    </div>
  );
}

function ContactModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactCreateDto>({
    resolver: zodResolver(contactCreateSchema),
    defaultValues: initial
      ? {
          nome: initial.nome,
          cognome: initial.cognome,
          ruolo: initial.ruolo ?? '',
          email: initial.email ?? '',
          telefono: initial.telefono ?? '',
          cellulare: initial.cellulare ?? '',
          isMain: initial.isMain,
        }
      : { nome: '', cognome: '', isMain: false },
  });

  const onSubmit = handleSubmit(async (dto) => {
    setServerError(null);
    try {
      if (initial) {
        await api.patch(`/suppliers/me/contacts/${initial.id}`, dto);
      } else {
        await api.post('/suppliers/me/contacts', dto);
      }
      onSaved();
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Errore di salvataggio');
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/50">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-semibold text-base mb-4">
          {initial ? 'Modifica contatto' : 'Nuovo contatto'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Nome *</FieldLabel>
            <Input invalid={!!errors.nome} {...register('nome')} />
            <FieldError>{errors.nome?.message}</FieldError>
          </div>
          <div>
            <FieldLabel>Cognome *</FieldLabel>
            <Input invalid={!!errors.cognome} {...register('cognome')} />
            <FieldError>{errors.cognome?.message}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Ruolo</FieldLabel>
            <Input {...register('ruolo')} placeholder="es. Responsabile vendite" />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Email</FieldLabel>
            <Input type="email" invalid={!!errors.email} {...register('email')} />
            <FieldError>{errors.email?.message as string}</FieldError>
          </div>
          <div>
            <FieldLabel>Telefono</FieldLabel>
            <Input type="tel" {...register('telefono')} />
          </div>
          <div>
            <FieldLabel>Cellulare</FieldLabel>
            <Input type="tel" {...register('cellulare')} />
          </div>
          <div className="sm:col-span-2">
            <Checkbox
              label="Imposta come contatto principale"
              {...register('isMain')}
            />
          </div>
        </div>
        {serverError && <p className="text-sm text-red-600 mt-3">{serverError}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <SecondaryButton type="button" onClick={onClose}>
            Annulla
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvataggio…' : 'Salva'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  onCancel,
  onConfirm,
  submitting,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onCancel}>
            Annulla
          </SecondaryButton>
          <DangerButton type="button" disabled={submitting} onClick={onConfirm}>
            {submitting ? 'Eliminazione…' : 'Elimina'}
          </DangerButton>
        </div>
      </div>
    </div>
  );
}
