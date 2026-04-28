import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSelfSchema, RegisterSelfDto } from '@soulmovie/shared';
import { api } from '@/lib/api';
import { useState } from 'react';

export const Route = createFileRoute('/register')({ component: Register });

function Register() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSelfDto>({ resolver: zodResolver(registerSelfSchema) });

  const onSubmit = handleSubmit(async (dto) => {
    setServerError(null);
    try {
      await api.post('/auth/register/self', dto);
      setDone(true);
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Errore registrazione');
    }
  });

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4 text-center">
          <h1 className="text-xl font-semibold">Controlla la tua email</h1>
          <p className="text-sm">Ti abbiamo inviato un link per confermare l'account.</p>
          <button onClick={() => navigate({ to: '/login' })} className="w-full bg-black text-white rounded py-2">
            Vai al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Registra la tua azienda</h1>
        {serverError && <p className="text-red-600 text-sm">{serverError}</p>}
        <input {...register('ragioneSociale')} placeholder="Ragione sociale" className="w-full border rounded px-3 py-2" />
        {errors.ragioneSociale && <p className="text-red-600 text-sm">{errors.ragioneSociale.message}</p>}
        <input {...register('email')} placeholder="Email" className="w-full border rounded px-3 py-2" />
        {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
        <input type="password" {...register('password')} placeholder="Password" className="w-full border rounded px-3 py-2" />
        {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
        <button disabled={isSubmitting} className="w-full bg-black text-white rounded py-2">Registrati</button>
        <p className="text-sm text-center">
          Hai già un account? <Link to="/login" className="underline">Accedi</Link>
        </p>
      </form>
    </div>
  );
}
