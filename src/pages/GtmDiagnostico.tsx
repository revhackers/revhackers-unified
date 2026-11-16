import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiagnosticLayout } from '@/components/diagnostics/DiagnosticLayout';
import SEO from '@/components/shared/SEO';
import { TurnstileWidget } from '@/components/shared/TurnstileWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  GTM_DECLARED_PHASES,
  GtmApiError,
  createGtmDiagnostic,
  type CreateGtmDiagnosticBody,
  type GtmDeclaredPhase,
} from '@/api/gtmDiagnostic';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
const COMPETITOR_SLOTS = 3;

interface GtmFormState {
  companyName: string;
  websiteUrl: string;
  declaredPhase: GtmDeclaredPhase;
  declaredIcp: string;
  competitors: string[];
  cnpj: string;
  arpuMonthly: string;
  cacEstimated: string;
  churnMonthlyPercent: string;
  salesCycleDays: string;
}

const INITIAL_FORM: GtmFormState = {
  companyName: '',
  websiteUrl: '',
  declaredPhase: GTM_DECLARED_PHASES[0],
  declaredIcp: '',
  competitors: Array.from({ length: COMPETITOR_SLOTS }, () => ''),
  cnpj: '',
  arpuMonthly: '',
  cacEstimated: '',
  churnMonthlyPercent: '',
  salesCycleDays: '',
};

function withScheme(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function toNumber(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function buildCrm(form: GtmFormState): CreateGtmDiagnosticBody['crm'] {
  const crm: NonNullable<CreateGtmDiagnosticBody['crm']> = {};
  const arpuMonthly = toNumber(form.arpuMonthly);
  const cacEstimated = toNumber(form.cacEstimated);
  const churnMonthlyPercent = toNumber(form.churnMonthlyPercent);
  const salesCycleDays = toNumber(form.salesCycleDays);
  if (arpuMonthly !== undefined) crm.arpuMonthly = arpuMonthly;
  if (cacEstimated !== undefined) crm.cacEstimated = cacEstimated;
  if (churnMonthlyPercent !== undefined) crm.churnMonthlyPercent = churnMonthlyPercent;
  if (salesCycleDays !== undefined) crm.salesCycleDays = salesCycleDays;
  return Object.keys(crm).length > 0 ? crm : undefined;
}

function submitErrorMessage(error: unknown): string {
  const code = error instanceof GtmApiError ? error.message : '';
  if (code === 'url_invalida') return 'Confira o endereço do site.';
  if (code === 'limite_diario') return 'Limite diário de diagnósticos atingido. Tente amanhã.';
  return 'Não foi possível iniciar. Tente de novo.';
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </Label>
      {children}
    </div>
  );
}

export default function GtmDiagnostico() {
  const navigate = useNavigate();
  const [form, setForm] = useState<GtmFormState>(INITIAL_FORM);
  const [numbersOpen, setNumbersOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  const updateField = <K extends keyof GtmFormState>(field: K, value: GtmFormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateCompetitor = (index: number, value: string) =>
    setForm((prev) => ({
      ...prev,
      competitors: prev.competitors.map((item, position) => (position === index ? value : item)),
    }));

  // Token do Turnstile é de uso único: após cada tentativa falha, o widget é remontado.
  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileKey((key) => key + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!turnstileToken || submitting) return;

    const cnpj = form.cnpj.replace(/\D/g, '');
    if (cnpj && cnpj.length !== 14) {
      setError('CNPJ precisa ter 14 dígitos.');
      return;
    }

    const declaredIcp = form.declaredIcp.trim();
    const crm = buildCrm(form);
    const body: CreateGtmDiagnosticBody = {
      companyName: form.companyName.trim(),
      websiteUrl: withScheme(form.websiteUrl),
      declaredPhase: form.declaredPhase,
      competitors: form.competitors.map(withScheme).filter(Boolean),
      turnstileToken,
      ...(declaredIcp ? { declaredIcp } : {}),
      ...(cnpj ? { cnpj } : {}),
      ...(crm ? { crm } : {}),
    };

    setError(null);
    setSubmitting(true);
    try {
      const { id } = await createGtmDiagnostic(body);
      navigate(`/diagnostico-gtm/r/${id}`);
    } catch (submitError) {
      setError(submitErrorMessage(submitError));
      setSubmitting(false);
      resetTurnstile();
    }
  };

  return (
    <>
      <SEO
        title="Diagnóstico de GTM"
        description="Lemos seu site e devolvemos tese, contradições e plano de 90 dias, com a fonte de cada afirmação."
        canonical="https://revhackers.com.br/diagnostico-gtm"
      />
      <DiagnosticLayout
        title="Diagnóstico de GTM"
        subtitle="Lemos seu site, cruzamos com o que você declara e devolvemos tese, contradições e plano de 90 dias com a fonte de cada afirmação."
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-7"
        >
          <Field id="gtm-company" label="Nome da empresa">
            <Input
              id="gtm-company"
              required
              minLength={2}
              maxLength={120}
              autoComplete="organization"
              value={form.companyName}
              onChange={(event) => updateField('companyName', event.target.value)}
            />
          </Field>

          <Field id="gtm-website" label="Site da empresa">
            <Input
              id="gtm-website"
              required
              inputMode="url"
              autoComplete="url"
              placeholder="https://"
              value={form.websiteUrl}
              onChange={(event) => updateField('websiteUrl', event.target.value)}
            />
          </Field>

          <Field id="gtm-phase" label="Fase declarada">
            <select
              id="gtm-phase"
              value={form.declaredPhase}
              onChange={(event) => updateField('declaredPhase', event.target.value as GtmDeclaredPhase)}
              className="flex h-10 w-full rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:border-revgreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-revgreen"
            >
              {GTM_DECLARED_PHASES.map((phase) => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </select>
          </Field>

          <Field id="gtm-icp" label="ICP declarado (opcional)">
            <Textarea
              id="gtm-icp"
              rows={3}
              maxLength={300}
              value={form.declaredIcp}
              onChange={(event) => updateField('declaredIcp', event.target.value)}
            />
          </Field>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-zinc-800">Concorrentes (opcional, até 3 sites)</legend>
            {form.competitors.map((competitor, index) => (
              <Input
                key={index}
                aria-label={`Concorrente ${index + 1}`}
                inputMode="url"
                placeholder="https://"
                value={competitor}
                onChange={(event) => updateCompetitor(index, event.target.value)}
              />
            ))}
          </fieldset>

          <Field id="gtm-cnpj" label="CNPJ (opcional)">
            <Input
              id="gtm-cnpj"
              inputMode="numeric"
              autoComplete="off"
              value={form.cnpj}
              onChange={(event) => updateField('cnpj', event.target.value)}
            />
          </Field>

          <div className="space-y-4">
            <button
              type="button"
              aria-expanded={numbersOpen}
              aria-controls="gtm-numbers"
              onClick={() => setNumbersOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-left text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Tenho números
              <span className="text-xs font-normal text-zinc-500">{numbersOpen ? 'Ocultar' : 'Opcional'}</span>
            </button>

            {numbersOpen && (
              <div id="gtm-numbers" className="grid gap-4 sm:grid-cols-2">
                <Field id="gtm-arpu" label="Ticket médio mensal (R$)">
                  <Input
                    id="gtm-arpu"
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.arpuMonthly}
                    onChange={(event) => updateField('arpuMonthly', event.target.value)}
                  />
                </Field>
                <Field id="gtm-cac" label="CAC estimado (R$)">
                  <Input
                    id="gtm-cac"
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.cacEstimated}
                    onChange={(event) => updateField('cacEstimated', event.target.value)}
                  />
                </Field>
                <Field id="gtm-churn" label="Churn mensal (%)">
                  <Input
                    id="gtm-churn"
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.churnMonthlyPercent}
                    onChange={(event) => updateField('churnMonthlyPercent', event.target.value)}
                  />
                </Field>
                <Field id="gtm-cycle" label="Ciclo de vendas (dias)">
                  <Input
                    id="gtm-cycle"
                    type="number"
                    min="1"
                    step="1"
                    value={form.salesCycleDays}
                    onChange={(event) => updateField('salesCycleDays', event.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          <TurnstileWidget key={turnstileKey} siteKey={TURNSTILE_SITE_KEY} onToken={handleTurnstileToken} />

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full"
            disabled={submitting || !turnstileToken}
          >
            {submitting ? 'Iniciando…' : 'Iniciar diagnóstico'}
          </Button>
        </form>
      </DiagnosticLayout>
    </>
  );
}
