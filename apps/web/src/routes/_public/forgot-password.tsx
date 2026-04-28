import { createFileRoute, Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordDto } from '@soulmovie/shared';
import { api } from '@/lib/api';
import { useState } from 'react';

export const Route = createFileRoute('/_public/forgot-password')({ component: Forgot });

function Forgot() {
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ForgotPasswordDto>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (dto) => {
    await api.post('/auth/forgot-password', dto).catch(() => {});
    setDone(true);
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">Reset password</h1>
        {done ? (
          <p className="text-sm">Se l'email esiste nel sistema, ti abbiamo inviato un link per il reset.</p>
        ) : (
          <>
            <input {...register('email')} placeholder="Email" className="w-full border rounded px-3 py-2" />
            {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
            <button disabled={isSubmitting} className="w-full bg-black text-white rounded py-2">Invia link</button>
          </>
        )}
        <p className="text-sm text-center">
          <Link to="/login" className="underline">Torna al login</Link>
        </p>
      </form>
    </div>
  );
}
