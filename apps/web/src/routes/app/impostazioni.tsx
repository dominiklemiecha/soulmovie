import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordDto, changePasswordSchema } from '@soulmovie/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  FieldError,
  FieldLabel,
  FormSection,
  Input,
  PageHeader,
  PrimaryButton,
} from '@/components/Field';

export const Route = createFileRoute('/app/impostazioni')({ component: ImpostazioniPage });

function ImpostazioniPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="space-y-5">
      <PageHeader
        title="Impostazioni personali"
        description={`Account: ${user?.email ?? '—'} · L'email di accesso non è modificabile, contatta l'amministratore se serve.`}
      />
      <PasswordCard />
    </div>
  );
}

function PasswordCard() {
  const [ok, setOk] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordDto>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (dto) => {
    setOk(false);
    setServerError(null);
    try {
      await api.post('/users/me/password', dto);
      setOk(true);
      reset({ currentPassword: '', newPassword: '' });
    } catch (e: any) {
      setServerError(e.response?.data?.error?.message ?? 'Errore');
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <FormSection title="Cambia password">
        <div>
          <FieldLabel>Password attuale</FieldLabel>
          <Input
            type="password"
            autoComplete="current-password"
            invalid={!!errors.currentPassword}
            {...register('currentPassword')}
          />
          <FieldError>{errors.currentPassword?.message}</FieldError>
        </div>
        <div>
          <FieldLabel>Nuova password</FieldLabel>
          <Input
            type="password"
            autoComplete="new-password"
            invalid={!!errors.newPassword}
            {...register('newPassword')}
          />
          <FieldError>{errors.newPassword?.message}</FieldError>
        </div>
        <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Aggiornamento…' : 'Aggiorna password'}
          </PrimaryButton>
          {ok && (
            <span className="text-sm text-green-700">
              Password aggiornata. Effettua di nuovo il login.
            </span>
          )}
          {serverError && <span className="text-sm text-red-600">{serverError}</span>}
        </div>
      </FormSection>
    </form>
  );
}
