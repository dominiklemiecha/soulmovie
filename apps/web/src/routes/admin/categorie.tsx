import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CategoryCreateDto, categoryCreateSchema } from '@soulmovie/shared';
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

export const Route = createFileRoute('/admin/categorie')({ component: CategoriePage });

interface Node {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  active: boolean;
  orderIndex: number;
  children: Node[];
}

function CategoriePage() {
  const qc = useQueryClient();
  const { data: tree = [], isLoading } = useQuery<Node[]>({
    queryKey: ['admin', 'categories', 'tree'],
    queryFn: async () => (await api.get('/admin/categories/tree')).data,
  });
  const allFlat = useMemo(() => flatten(tree), [tree]);
  const [createUnder, setCreateUnder] = useState<Node | null | 'root'>(null);
  const [editing, setEditing] = useState<Node | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Node | null>(null);

  const removeMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories', 'tree'] });
      setConfirmDelete(null);
    },
  });
  const toggleActiveMut = useMutation({
    mutationFn: async (n: Node) => api.patch(`/admin/categories/${n.id}`, { active: !n.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'categories', 'tree'] }),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categorie merceologiche"
        description="Tassonomia ad albero delle categorie. I fornitori potranno selezionare i nodi che li riguardano."
        actions={
          <PrimaryButton type="button" onClick={() => setCreateUnder('root')}>
            + Nuova radice
          </PrimaryButton>
        }
      />

      {isLoading && <p className="text-sm text-gray-500">Caricamento…</p>}
      {!isLoading && tree.length === 0 && (
        <div className="rounded border bg-white p-6 text-center text-sm text-gray-500">
          Nessuna categoria ancora definita.
        </div>
      )}

      <div className="bg-white rounded-lg border shadow-sm divide-y">
        {tree.map((root) => (
          <TreeNode
            key={root.id}
            node={root}
            level={0}
            onAddChild={(p) => setCreateUnder(p)}
            onEdit={(n) => setEditing(n)}
            onDelete={(n) => setConfirmDelete(n)}
            onToggleActive={(n) => toggleActiveMut.mutate(n)}
          />
        ))}
      </div>

      {createUnder !== null && (
        <CategoryFormModal
          parent={createUnder === 'root' ? null : createUnder}
          allCategories={allFlat}
          onClose={() => setCreateUnder(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'categories', 'tree'] });
            setCreateUnder(null);
          }}
        />
      )}
      {editing && (
        <CategoryEditModal
          node={editing}
          allCategories={allFlat}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'categories', 'tree'] });
            setEditing(null);
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Eliminare categoria?"
          message={`Eliminare ${confirmDelete.code} — ${confirmDelete.name}? Possibile solo se non ha figli e non è assegnata a fornitori.`}
          submitting={removeMut.isPending}
          error={(removeMut.error as any)?.response?.data?.error?.message}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => removeMut.mutate(confirmDelete.id)}
        />
      )}
    </div>
  );
}

function TreeNode({
  node,
  level,
  onAddChild,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  node: Node;
  level: number;
  onAddChild: (n: Node) => void;
  onEdit: (n: Node) => void;
  onDelete: (n: Node) => void;
  onToggleActive: (n: Node) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 sm:px-4 py-2.5 hover:bg-gray-50"
        style={{ paddingLeft: `${12 + level * 18}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && setOpen(!open)}
          className={`w-6 h-6 flex items-center justify-center rounded text-gray-500 ${
            hasChildren ? 'hover:bg-gray-200' : 'opacity-30 cursor-default'
          }`}
          aria-label={open ? 'Chiudi' : 'Apri'}
        >
          {hasChildren ? (open ? '▾' : '▸') : '·'}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
              {node.code}
            </span>
            <span className={`text-sm ${node.active ? '' : 'line-through text-gray-400'}`}>
              {node.name}
            </span>
            {!node.active && (
              <span className="text-[10px] uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                Disattivata
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <IconBtn title="Aggiungi figlio" onClick={() => onAddChild(node)}>
            +
          </IconBtn>
          <IconBtn title="Modifica" onClick={() => onEdit(node)}>
            ✎
          </IconBtn>
          <IconBtn
            title={node.active ? 'Disattiva' : 'Attiva'}
            onClick={() => onToggleActive(node)}
          >
            {node.active ? '○' : '●'}
          </IconBtn>
          <IconBtn title="Elimina" onClick={() => onDelete(node)} danger>
            🗑
          </IconBtn>
        </div>
      </div>
      {open && hasChildren && (
        <div className="border-t">
          {node.children.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              level={level + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-9 h-9 rounded text-sm flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 ${
        danger ? 'text-red-700' : 'text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

function CategoryFormModal({
  parent,
  allCategories,
  onClose,
  onSaved,
}: {
  parent: Node | null;
  allCategories: Node[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryCreateDto>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: {
      code: '',
      name: '',
      parentId: parent?.id ?? null,
      orderIndex: 0,
      active: true,
    },
  });

  const onSubmit = handleSubmit(async (dto) => {
    setServerError(null);
    try {
      await api.post('/admin/categories', dto);
      onSaved();
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Errore di salvataggio');
    }
  });

  return (
    <ModalShell title={parent ? `Nuova sotto-categoria di ${parent.code}` : 'Nuova categoria radice'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Codice *</FieldLabel>
            <Input invalid={!!errors.code} {...register('code')} placeholder="es. ST001" />
            <FieldError>{errors.code?.message}</FieldError>
          </div>
          <div>
            <FieldLabel>Nome *</FieldLabel>
            <Input invalid={!!errors.name} {...register('name')} />
            <FieldError>{errors.name?.message}</FieldError>
          </div>
          <div>
            <FieldLabel>Padre</FieldLabel>
            <select
              defaultValue={parent?.id ?? ''}
              {...register('parentId', {
                setValueAs: (v) => (v === '' ? null : v),
              })}
              className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm bg-white min-h-[44px]"
            >
              <option value="">— Radice —</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {indent(c)} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Ordinamento</FieldLabel>
            <Input
              type="number"
              {...register('orderIndex', { valueAsNumber: true })}
            />
          </div>
          <div className="sm:col-span-2">
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
    </ModalShell>
  );
}

function CategoryEditModal({
  node,
  allCategories,
  onClose,
  onSaved,
}: {
  node: Node;
  allCategories: Node[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [name, setName] = useState(node.name);
  const [parentId, setParentId] = useState<string | ''>(node.parentId ?? '');
  const [orderIndex, setOrderIndex] = useState(node.orderIndex);
  const [active, setActive] = useState(node.active);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSubmitting(true);
    try {
      await api.patch(`/admin/categories/${node.id}`, {
        name,
        parentId: parentId === '' ? null : parentId,
        orderIndex,
        active,
      });
      onSaved();
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Errore di salvataggio');
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleParents = allCategories.filter((c) => c.id !== node.id);

  return (
    <ModalShell title={`Modifica ${node.code}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Codice (read-only)</FieldLabel>
            <Input value={node.code} disabled />
          </div>
          <div>
            <FieldLabel>Nome *</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Padre</FieldLabel>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value as any)}
              className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm bg-white min-h-[44px]"
            >
              <option value="">— Radice —</option>
              {eligibleParents.map((c) => (
                <option key={c.id} value={c.id}>
                  {indent(c)} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Ordinamento</FieldLabel>
            <Input
              type="number"
              value={orderIndex}
              onChange={(e) => setOrderIndex(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="sm:col-span-2">
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
    </ModalShell>
  );
}

function ConfirmModal({
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
    <ModalShell title={title} onClose={onCancel}>
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
    </ModalShell>
  );
}

function ModalShell({
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

function flatten(roots: Node[]): Node[] {
  const out: Node[] = [];
  const walk = (nodes: Node[]) => {
    for (const n of nodes) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(roots);
  return out;
}

function indent(node: Node): string {
  // approssimato: precedi col numero di livelli scoprendo i parent dal flat (qui usiamo 0).
  // L'indentazione vera viene dalla dom, ma in select usiamo un prefisso semplice.
  return node.parentId ? '└' : '';
}
