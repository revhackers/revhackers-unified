import type { PipelineInput } from '../src/pipeline.js';

export interface CaseDefinition extends Omit<PipelineInput, 'providers'> {}

export const CASES: Record<string, CaseDefinition> = {
  revhackers: {
    companyName: 'RevHackers',
    websiteUrl: 'https://revhackers.com.br',
    declaredPhase: 'Primeira Tração Validada',
    declaredIcp: 'CEOs, CROs e Fundadores de empresas B2B SaaS e Tecnologia no Brasil',
    competitors: [
      'https://growthmachine.com.br',
      'https://outboundmarketing.com.br',
    ],
    // No CRM/financial or market inputs: we do not have the company's real numbers.
    // Never put invented values here — the number guard treats inputs as trusted.
  },
  agendor: {
    companyName: 'Agendor',
    websiteUrl: 'https://www.agendor.com.br',
    declaredPhase: 'Escala Estruturada',
    declaredIcp: 'Gestores e equipes comerciais B2B de pequenas e médias empresas no Brasil',
    competitors: [
      'https://www.pipedrive.com/pt',
      'https://www.rdstation.com/crm/',
    ],
  },
};
