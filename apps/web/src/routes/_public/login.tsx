import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginDto } from '@soulmovie/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useState } from 'react';

export const Route = createFileRoute('/_public/login')({ component: Login });

function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (dto) => {
    setServerError(null);
    try {
      const r = await api.post('/auth/login', dto);
      setAuth(r.data.accessToken, r.data.user);
      navigate({ to: r.data.user.role === 'admin' ? '/admin' : '/app' });
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Errore di accesso');
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Accedi a Soulmovie</h1>
        {serverError && <p className="text-red-600 text-sm">{serverError}</p>}
        <div>
          <label className="block text-sm">Email</label>
          <input {...register('email')} className="w-full border rounded px-3 py-2" />
          {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input type="password" {...register('password')} className="w-full border rounded px-3 py-2" />
        </div>
        <button disabled={isSubmitting} className="w-full bg-black text-white rounded py-2">Accedi</button>
        <p className="text-sm text-center">
          Non hai un account? <Link to="/register" className="underline">Registrati</Link>
        </p>
        <p className="text-sm text-center">
          <Link to="/forgot-password" className="underline">Password dimenticata?</Link>
        </p>
      </form>
    </div>
  );
}
