import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { acceptInviteSchema, AcceptInviteDto } from '@soulmovie/shared';
import { api } from '@/lib/api';
import { useState } from 'react';

export const Route = createFileRoute('/accept-invite')({
  component: Accept,
  validateSearch: (s: Record<string, unknown>) => ({ token: String(s.token ?? '') }),
});

function Accept() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } =
    useForm<AcceptInviteDto>({
      resolver: zodResolver(acceptInviteSchema),
      defaultValues: { token, password: '' },
    });

  setValue('token', token);

  const onSubmit = handleSubmit(async (dto) => {
    setServerError(null);
    try {
      await api.post('/auth/accept-invite', dto);
      navigate({ to: '/login' });
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Operazione fallita');
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">Imposta la tua password</h1>
        <p className="text-sm text-gray-600">Sei stato invitato. Imposta una password per attivare il tuo account.</p>
        {serverError && <p className="text-red-600 text-sm">{serverError}</p>}
        <input type="password" {...register('password')} placeholder="Password" className="w-full border rounded px-3 py-2" />
        {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
        <button disabled={isSubmitting} className="w-full bg-black text-white rounded py-2">Attiva account</button>
        <p className="text-sm text-center">
          <Link to="/login" className="underline">Annulla</Link>
        </p>
      </form>
    </div>
  );
}
