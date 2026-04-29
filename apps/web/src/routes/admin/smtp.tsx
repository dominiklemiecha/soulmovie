import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SmtpSettingsDto, smtpSettingsSchema } from '@soulmovie/shared';
import { api } from '@/lib/api';
import {
  Checkbox,
  FieldError,
  FieldLabel,
  FormSection,
  Input,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/components/Field';

export const Route = createFileRoute('/admin/smtp')({ component: SmtpPage });

function SmtpPage() {
  const qc = useQueryClient();
  const [savedFlash, setSavedFlash] = useState(false);
  const { data, isLoading } = useQuery<SmtpSettingsDto | null>({
    queryKey: ['admin', 'smtp'],
    queryFn: async () => (await api.get('/admin/settings/smtp')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SmtpSettingsDto>({
    resolver: zodResolver(smtpSettingsSchema as any) as any,
    defaultValues: {
      host: '',
      port: 587,
      user: '',
      password: '',
      from: '',
      tls: true,
    },
  });

  useEffect(() => {
    if (data) reset(data as any);
  }, [data, reset]);

  const saveMut = useMutation({
    mutationFn: async (dto: SmtpSettingsDto) => (await api.put('/admin/settings/smtp', dto)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'smtp'] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    },
  });

  const [testTo, setTestTo] = useState('');
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const sendTest = async () => {
    setTestMsg(null);
    setTesting(true);
    try {
      await api.post('/admin/settings/smtp/test', { to: testTo });
      setTestMsg({ ok: true, text: `Email di test inviata a ${testTo}.` });
    } catch (e: any) {
      setTestMsg({ ok: false, text: e.response?.data?.error?.message ?? 'Errore' });
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) return <p className="text-sm text-gray-500">Caricamento…</p>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configurazione SMTP"
        description="Imposta il server SMTP usato per spedire email transazionali (verifica account, reset password, scadenze, alert). Le credenziali sono cifrate AES-256-GCM nel database."
      />
      {savedFlash && (
        <div className="rounded border border-green-300 bg-green-50 text-green-800 text-sm px-4 py-2">
          Configurazione SMTP salvata.
        </div>
      )}
      {!data && (
        <div className="rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
          Nessun SMTP configurato. Le email vengono attualmente inviate al server di sviluppo
          (MailHog) — visibili su <a className="underline" href="http://localhost:8025" target="_blank" rel="noopener">localhost:8025</a>.
          In produzione configura un SMTP reale qui sotto.
        </div>
      )}

      <form onSubmit={handleSubmit((dto) => saveMut.mutate(dto))} className="space-y-4">
        <FormSection title="Server SMTP">
          <div>
            <FieldLabel>Host *</FieldLabel>
            <Input invalid={!!errors.host} {...register('host')} placeholder="smtp.example.com" />
            <FieldError>{errors.host?.message}</FieldError>
          </div>
          <div>
            <FieldLabel>Porta *</FieldLabel>
            <Input
              type="number"
              invalid={!!errors.port}
              {...register('port', { valueAsNumber: true })}
              placeholder="587"
            />
            <FieldError>{errors.port?.message as string}</FieldError>
          </div>
          <div>
            <FieldLabel>Username</FieldLabel>
            <Input {...register('user')} autoComplete="off" />
          </div>
          <div>
            <FieldLabel>Password</FieldLabel>
            <Input type="password" {...register('password')} autoComplete="new-password" />
            <p className="text-[11px] text-gray-500 mt-1">
              Lascia "••••••••" per non modificare la password salvata.
            </p>
          </div>
          <div>
            <FieldLabel>From *</FieldLabel>
            <Input
              type="email"
              invalid={!!errors.from}
              {...register('from')}
              placeholder="noreply@tuodominio.it"
            />
            <FieldError>{errors.from?.message as string}</FieldError>
          </div>
          <div className="flex items-end">
            <Checkbox label="Usa TLS / SSL" {...register('tls')} />
          </div>
        </FormSection>
        <div className="flex justify-end gap-2">
          <PrimaryButton type="submit" disabled={isSubmitting || saveMut.isPending}>
            {isSubmitting || saveMut.isPending ? 'Salvataggio…' : 'Salva configurazione'}
          </PrimaryButton>
        </div>
      </form>

      <FormSection title="Invia email di test">
        <div className="md:col-span-2">
          <FieldLabel>Indirizzo destinatario</FieldLabel>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="tu@example.com"
              className="flex-1"
            />
            <SecondaryButton type="button" onClick={sendTest} disabled={!testTo || testing}>
              {testing ? 'Invio…' : 'Invia email di test'}
            </SecondaryButton>
          </div>
          {testMsg && (
            <p
              className={`mt-2 text-sm ${
                testMsg.ok ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {testMsg.text}
            </p>
          )}
        </div>
      </FormSection>
    </div>
  );
}
