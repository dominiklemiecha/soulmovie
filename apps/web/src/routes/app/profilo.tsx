import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  COUNTRIES,
  CURRENCIES,
  Gender,
  LegalNature,
  PROVINCE_IT,
  SupplierUpdateDto,
  supplierUpdateSchema,
} from '@soulmovie/shared';
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
  Select,
} from '@/components/Field';

export const Route = createFileRoute('/app/profilo')({ component: ProfiloPage });

const LEGAL_NATURE_LABEL: Record<LegalNature, string> = {
  [LegalNature.CORPORATION]: 'Società di capitali',
  [LegalNature.PARTNERSHIP]: 'Società di persone',
  [LegalNature.NATURAL_PERSON]: 'Persona fisica',
  [LegalNature.OTHER]: 'Altro',
};

function ProfiloPage() {
  const qc = useQueryClient();
  const [savedFlash, setSavedFlash] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', 'me'],
    queryFn: async () => (await api.get('/suppliers/me')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SupplierUpdateDto>({
    resolver: zodResolver(supplierUpdateSchema),
    defaultValues: {
      isPersonaFisica: false,
      ragioneSociale: '',
      paese: 'IT',
      valuta: 'EUR',
      viesRegistered: false,
    },
  });

  useEffect(() => {
    if (data) reset(normalizeForForm(data));
  }, [data, reset]);

  const isPF = useWatch({ control, name: 'isPersonaFisica' });
  const paeseSel = useWatch({ control, name: 'paese' });

  const mut = useMutation({
    mutationFn: async (dto: SupplierUpdateDto) => (await api.patch('/suppliers/me', dto)).data,
    onSuccess: (saved) => {
      qc.setQueryData(['suppliers', 'me'], saved);
      reset(normalizeForForm(saved));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    },
  });

  const onSubmit = handleSubmit((dto) => mut.mutate(dto));

  if (isLoading) {
    return <p className="text-sm text-gray-500">Caricamento…</p>;
  }

  const incompletes = data ? listIncompleteFields(data) : [];

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {incompletes.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
          <strong>Profilo incompleto.</strong> Per facilitare l'approvazione e il lavoro con
          l'amministrazione, completa: {incompletes.join(', ')}.
        </div>
      )}
      <PageHeader
        title="Società e contatti"
        description="Anagrafica della tua azienda. I dati sono visibili agli amministratori."
        actions={
          <PrimaryButton type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Salvataggio…' : 'Salva modifiche'}
          </PrimaryButton>
        }
      />

      {savedFlash && (
        <div className="rounded border border-green-300 bg-green-50 text-green-800 text-sm px-4 py-2">
          Modifiche salvate.
        </div>
      )}
      {mut.isError && (
        <ErrorModal
          message={(mut.error as any)?.response?.data?.error?.message ?? 'Errore di salvataggio'}
          onClose={() => mut.reset()}
        />
      )}

      <FormSection
        title="Informazioni società / persona fisica"
        description="Inserisci i dati anagrafici principali."
      >
        <div className="md:col-span-2">
          <Checkbox
            label="Il soggetto che si registra è una persona fisica"
            {...register('isPersonaFisica')}
          />
        </div>
        <div>
          <FieldLabel>Paese *</FieldLabel>
          <Select invalid={!!errors.paese} {...register('paese')}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError>{errors.paese?.message as string}</FieldError>
        </div>
        <div>
          <FieldLabel>{isPF ? 'Cognome *' : 'Ragione sociale *'}</FieldLabel>
          <Input invalid={!!errors.ragioneSociale} {...register('ragioneSociale')} />
          <FieldError>{errors.ragioneSociale?.message}</FieldError>
        </div>
        {isPF && (
          <>
            <div>
              <FieldLabel>Nome *</FieldLabel>
              <Input invalid={!!errors.nome} {...register('nome')} />
              <FieldError>{errors.nome?.message}</FieldError>
            </div>
            <div>
              <FieldLabel>Sesso</FieldLabel>
              <Select {...register('sesso')}>
                <option value="">—</option>
                <option value={Gender.F}>F</option>
                <option value={Gender.M}>M</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Paese di nascita</FieldLabel>
              <Select {...register('paeseNascita')}>
                <option value="">—</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Provincia di nascita</FieldLabel>
              <Select {...register('provinciaNascita')}>
                <option value="">—</option>
                {PROVINCE_IT.map((p) => (
                  <option key={p.sigla} value={p.sigla}>
                    {p.sigla} — {p.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Città di nascita</FieldLabel>
              <Input {...register('cittaNascita')} />
            </div>
            <div>
              <FieldLabel>Data di nascita *</FieldLabel>
              <Input type="date" invalid={!!errors.dataNascita} {...register('dataNascita')} />
              <FieldError>{errors.dataNascita?.message as string}</FieldError>
            </div>
          </>
        )}
      </FormSection>

      <FormSection title="Sede legale">
        <div className="md:col-span-2">
          <FieldLabel>Indirizzo</FieldLabel>
          <Input {...register('indirizzo')} />
        </div>
        <div>
          <FieldLabel>CAP</FieldLabel>
          <Input {...register('cap')} />
        </div>
        <div>
          <FieldLabel>Città</FieldLabel>
          <Input {...register('citta')} />
        </div>
        <div>
          <FieldLabel>Provincia / Regione</FieldLabel>
          {paeseSel === 'IT' ? (
            <Select {...register('provincia')}>
              <option value="">—</option>
              {PROVINCE_IT.map((p) => (
                <option key={p.sigla} value={p.sigla}>
                  {p.sigla} — {p.nome}
                </option>
              ))}
            </Select>
          ) : (
            <Input {...register('provincia')} placeholder="Regione/Stato" />
          )}
          <FieldError>{errors.provincia?.message as string}</FieldError>
        </div>
      </FormSection>

      <FormSection title="Contatti aziendali">
        <div>
          <FieldLabel>Email aziendale</FieldLabel>
          <Input type="email" {...register('emailAziendale')} />
        </div>
        <div>
          <FieldLabel>PEC</FieldLabel>
          <Input type="email" {...register('pec')} />
        </div>
        <div>
          <FieldLabel>Telefono</FieldLabel>
          <Input type="tel" {...register('telefono')} />
        </div>
        <div>
          <FieldLabel>Sito web</FieldLabel>
          <Input type="url" {...register('sitoWeb')} placeholder="https://" />
        </div>
      </FormSection>

      <FormSection title="Dati identificativi e valuta">
        <div>
          <FieldLabel>Natura giuridica</FieldLabel>
          <Select {...register('naturaGiuridica')}>
            <option value="">—</option>
            {Object.values(LegalNature).map((v) => (
              <option key={v} value={v}>
                {LEGAL_NATURE_LABEL[v]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Checkbox
            label="Partita IVA registrata nel VIES"
            {...register('viesRegistered')}
          />
        </div>
        <div>
          <FieldLabel>Codice fiscale</FieldLabel>
          <Input invalid={!!errors.codiceFiscale} {...register('codiceFiscale')} />
          <FieldError>{errors.codiceFiscale?.message as string}</FieldError>
        </div>
        <div>
          <FieldLabel>Partita IVA</FieldLabel>
          <Input invalid={!!errors.partitaIva} {...register('partitaIva')} />
          <FieldError>{errors.partitaIva?.message as string}</FieldError>
        </div>
        <div>
          <FieldLabel>Partita IVA extra-comunitaria / N. registrazione</FieldLabel>
          <Input {...register('partitaIvaExtraUe')} />
        </div>
        <div>
          <FieldLabel>Gruppo IVA</FieldLabel>
          <Input {...register('gruppoIva')} />
        </div>
        <div>
          <FieldLabel>Valuta</FieldLabel>
          <Select {...register('valuta')}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>IBAN</FieldLabel>
          <Input {...register('iban')} />
        </div>
      </FormSection>

      <div className="flex justify-end pt-2">
        <PrimaryButton type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Salvataggio…' : 'Salva modifiche'}
        </PrimaryButton>
      </div>
    </form>
  );
}

function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xl shrink-0">
            !
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base">Impossibile salvare</h3>
            <p className="text-sm text-gray-700 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Chiudi
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function listIncompleteFields(s: any): string[] {
  const out: string[] = [];
  if (s.isPersonaFisica) {
    if (!s.codiceFiscale) out.push('Codice fiscale');
    if (!s.dataNascita) out.push('Data di nascita');
  } else {
    if (!s.partitaIva) out.push('Partita IVA');
  }
  if (!s.indirizzo) out.push('Indirizzo');
  if (!s.cap) out.push('CAP');
  if (!s.citta) out.push('Città');
  if (!s.provincia) out.push('Provincia');
  if (!s.emailAziendale && !s.pec) out.push('Email aziendale o PEC');
  if (!s.telefono) out.push('Telefono');
  if (!s.iban) out.push('IBAN');
  return out;
}

function normalizeForForm(s: any): SupplierUpdateDto {
  return {
    isPersonaFisica: !!s.isPersonaFisica,
    ragioneSociale: s.ragioneSociale ?? '',
    nome: s.nome ?? '',
    sesso: s.sesso ?? null,
    paeseNascita: s.paeseNascita ?? '',
    provinciaNascita: s.provinciaNascita ?? '',
    cittaNascita: s.cittaNascita ?? '',
    dataNascita: s.dataNascita ?? '',
    paese: s.paese ?? 'IT',
    indirizzo: s.indirizzo ?? '',
    cap: s.cap ?? '',
    citta: s.citta ?? '',
    provincia: s.provincia ?? '',
    sitoWeb: s.sitoWeb ?? '',
    emailAziendale: s.emailAziendale ?? '',
    pec: s.pec ?? '',
    telefono: s.telefono ?? '',
    naturaGiuridica: s.naturaGiuridica ?? null,
    viesRegistered: !!s.viesRegistered,
    codiceFiscale: s.codiceFiscale ?? '',
    partitaIva: s.partitaIva ?? '',
    partitaIvaExtraUe: s.partitaIvaExtraUe ?? '',
    iban: s.iban ?? '',
    valuta: s.valuta ?? 'EUR',
    gruppoIva: s.gruppoIva ?? '',
  };
}
