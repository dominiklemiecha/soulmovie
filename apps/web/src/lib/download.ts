import { api } from './api';

export async function downloadCsv(path: string, params: Record<string, any>, filename: string) {
  const r = await api.get(path, { params, responseType: 'blob' });
  const blob = new Blob([r.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
