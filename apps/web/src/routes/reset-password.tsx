import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, ResetPasswordDto } from '@soulmovie/shared';
import { api } from '@/lib/api';
import { useState } from 'react';

export const Route = createFileRoute('/reset-password')({
  component: Reset,
  validateSearch: (s: Record<string, unknown>) => ({ token: String(s.token ?? '') }),
});

function Reset() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } =
    useForm<ResetPasswordDto>({
      resolver: zodResolver(resetPasswordSchema),
      defaultValues: { token, password: '' },
    });

  setValue('token', token);

  const onSubmit = handleSubmit(async (dto) => {
    setServerError(null);
    try {
      await api.post('/auth/reset-password', dto);
      navigate({ to: '/login' });
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Reset fallito');
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">Nuova password</h1>
        {serverError && <p className="text-red-600 text-sm">{serverError}</p>}
        <input type="password" {...register('password')} placeholder="Nuova password" className="w-full border rounded px-3 py-2" />
        {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
        <button disabled={isSubmitting} className="w-full bg-black text-white rounded py-2">Imposta password</button>
        <p className="text-sm text-center">
          <Link to="/login" className="underline">Annulla</Link>
        </p>
      </form>
    </div>
  );
}
