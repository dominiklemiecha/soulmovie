import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export const Route = createFileRoute('/_public/verify-email')({
  component: VerifyEmail,
  validateSearch: (s: Record<string, unknown>) => ({ token: String(s.token ?? '') }),
});

function VerifyEmail() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<'loading' | 'ok' | 'err'>('loading');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('err');
      setMsg('Token mancante');
      return;
    }
    api
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setState('ok'))
      .catch((e) => {
        setState('err');
        setMsg(e.response?.data?.error?.message ?? 'Token non valido');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4 text-center">
        {state === 'loading' && <p>Verifica in corso...</p>}
        {state === 'ok' && (
          <>
            <h1 className="text-xl font-semibold">Email verificata</h1>
            <Link to="/login" className="block w-full bg-black text-white rounded py-2">Vai al login</Link>
          </>
        )}
        {state === 'err' && (
          <>
            <h1 className="text-xl font-semibold text-red-600">Verifica fallita</h1>
            <p className="text-sm">{msg}</p>
          </>
        )}
      </div>
    </div>
  );
}
