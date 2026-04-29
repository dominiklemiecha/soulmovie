import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader, PrimaryButton, SecondaryButton } from '@/components/Field';

export const Route = createFileRoute('/app/categorie')({ component: CategoriePicker });

interface Node {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  active: boolean;
  orderIndex: number;
  children: Node[];
}

function CategoriePicker() {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const { data: tree = [] } = useQuery<Node[]>({
    queryKey: ['categories', 'tree'],
    queryFn: async () => (await api.get('/categories/tree')).data,
  });
  const { data: selectedIds = [], isLoading } = useQuery<string[]>({
    queryKey: ['suppliers', 'me', 'categories'],
    queryFn: async () => (await api.get('/suppliers/me/categories')).data,
  });

  const flat = useMemo(() => flatten(tree), [tree]);
  const flatById = useMemo(() => new Map(flat.map((n) => [n.id, n])), [flat]);
  const ancestorsOf = (id: string): Node[] => {
    const path: Node[] = [];
    let cur = flatById.get(id);
    while (cur && cur.parentId) {
      const p = flatById.get(cur.parentId);
      if (!p) break;
      path.unshift(p);
      cur = p;
    }
    return path;
  };

  const setMut = useMutation({
    mutationFn: async (categoryIds: string[]) =>
      (await api.put('/suppliers/me/categories', { categoryIds })).data,
    onSuccess: (saved) => {
      qc.setQueryData(['suppliers', 'me', 'categories'], saved);
      setPickerOpen(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    },
  });

  const removeOne = (id: string) => {
    setMut.mutate(selectedIds.filter((x) => x !== id));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categorie merceologiche"
        description="Seleziona le categorie che meglio descrivono ciò che la tua azienda fornisce."
        actions={
          <PrimaryButton type="button" onClick={() => setPickerOpen(true)}>
            Modifica selezione
          </PrimaryButton>
        }
      />

      {savedFlash && (
        <div className="rounded border border-green-300 bg-green-50 text-green-800 text-sm px-4 py-2">
          Selezione salvata.
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Caricamento…</p>
      ) : selectedIds.length === 0 ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-gray-500">
          Nessuna categoria assegnata. Clicca "Modifica selezione" per iniziare.
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm divide-y">
          {selectedIds.map((id) => {
            const node = flatById.get(id);
            if (!node) return null;
            const path = ancestorsOf(id);
            return (
              <div key={id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  {path.length > 0 && (
                    <div className="text-xs text-gray-500 truncate">
                      {path.map((p) => p.name).join(' › ')}
                    </div>
                  )}
                  <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                      {node.code}
                    </span>
                    <span>{node.name}</span>
                  </div>
                </div>
                <SecondaryButton
                  type="button"
                  onClick={() => removeOne(id)}
                  className="!min-h-[36px] !py-1 !text-red-700 !border-red-200 hover:!bg-red-50"
                >
                  Rimuovi
                </SecondaryButton>
              </div>
            );
          })}
        </div>
      )}

      {pickerOpen && (
        <PickerModal
          tree={tree}
          initialSelected={selectedIds}
          submitting={setMut.isPending}
          error={(setMut.error as any)?.response?.data?.error?.message}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(ids) => setMut.mutate(ids)}
        />
      )}
    </div>
  );
}

function PickerModal({
  tree,
  initialSelected,
  onCancel,
  onConfirm,
  submitting,
  error,
}: {
  tree: Node[];
  initialSelected: string[];
  onCancel: () => void;
  onConfirm: (ids: string[]) => void;
  submitting: boolean;
  error?: string;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set(initialSelected));
  const [filter, setFilter] = useState('');
  const lower = filter.trim().toLowerCase();

  useEffect(() => setSel(new Set(initialSelected)), [initialSelected]);

  const matches = (n: Node): boolean =>
    !lower ||
    n.code.toLowerCase().includes(lower) ||
    n.name.toLowerCase().includes(lower) ||
    n.children.some(matches);

  const toggle = (id: string) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-base">Seleziona categorie</h3>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded hover:bg-gray-100 text-gray-500"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
        <div className="p-4 border-b">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtra per codice o nome…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm min-h-[44px]"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {tree.filter(matches).map((n) => (
            <PickerNode
              key={n.id}
              node={n}
              level={0}
              selected={sel}
              onToggle={toggle}
              filter={lower}
            />
          ))}
        </div>
        <div className="p-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-sm text-gray-600">{sel.size} selezionate</span>
          <div className="flex gap-2 justify-end">
            <SecondaryButton type="button" onClick={onCancel}>
              Annulla
            </SecondaryButton>
            <PrimaryButton
              type="button"
              disabled={submitting}
              onClick={() => onConfirm(Array.from(sel))}
            >
              {submitting ? 'Salvataggio…' : 'Salva selezione'}
            </PrimaryButton>
          </div>
        </div>
        {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function PickerNode({
  node,
  level,
  selected,
  onToggle,
  filter,
}: {
  node: Node;
  level: number;
  selected: Set<string>;
  onToggle: (id: string) => void;
  filter: string;
}) {
  const [open, setOpen] = useState(filter.length > 0);
  const matches = (n: Node): boolean =>
    !filter ||
    n.code.toLowerCase().includes(filter) ||
    n.name.toLowerCase().includes(filter) ||
    n.children.some(matches);
  const visibleChildren = node.children.filter(matches);
  const hasChildren = visibleChildren.length > 0;
  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 ${
          !node.active ? 'opacity-50' : ''
        }`}
        style={{ paddingLeft: `${4 + level * 16}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && setOpen(!open)}
          className={`w-6 h-6 flex items-center justify-center rounded text-gray-500 ${
            hasChildren ? 'hover:bg-gray-200' : 'opacity-30 cursor-default'
          }`}
        >
          {hasChildren ? (open ? '▾' : '▸') : '·'}
        </button>
        <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer min-h-[36px]">
          <input
            type="checkbox"
            disabled={!node.active}
            className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            checked={selected.has(node.id)}
            onChange={() => onToggle(node.id)}
          />
          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
            {node.code}
          </span>
          <span className="text-sm truncate">{node.name}</span>
        </label>
      </div>
      {open && hasChildren && (
        <div>
          {visibleChildren.map((c) => (
            <PickerNode
              key={c.id}
              node={c}
              level={level + 1}
              selected={selected}
              onToggle={onToggle}
              filter={filter}
            />
          ))}
        </div>
      )}
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
