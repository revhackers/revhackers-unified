import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';
import { createBedrockProvider } from '../src/ai/providers/bedrock.js';
import { stageCollect, stageCritic, stageDossier, stageExtract, stageModule } from '../src/stages.js';
import { runGtmDiagnostic, type PhaseStages, type RunPayload, type StepRunner } from './phases.js';
import { createRender } from './render.js';

const STEP_CONFIG = {
  retries: { limit: 2, delay: '10 seconds', backoff: 'exponential' },
  timeout: '10 minutes',
} as const;

/** Fase `collect` ao criar o diagnóstico; `analyze` ao desbloquear o contato. */
export class GtmDiagnosticWorkflow extends WorkflowEntrypoint<Env, RunPayload> {
  async run(event: Readonly<WorkflowEvent<RunPayload>>, step: WorkflowStep): Promise<void> {
    const providers = {
      bedrock: createBedrockProvider({
        region: this.env.AWS_REGION,
        credentials: async () => ({
          accessKeyId: this.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: this.env.AWS_SECRET_ACCESS_KEY,
        }),
      }),
    };
    const deps = { providers };
    const render = createRender(this.env);

    const stages: PhaseStages = {
      collect: (input) => stageCollect(input, { render }),
      extract: (collect) => stageExtract(collect, deps),
      dossier: (input, collect, extracts) => stageDossier(input, collect, extracts, deps),
      module: (key, ctx) => stageModule(key, ctx, deps),
      critic: (collect, dossier, modules) => stageCritic(collect, dossier, modules, deps),
    };
    const runner: StepRunner = {
      do: (name, fn) => step.do(name, STEP_CONFIG, fn),
      sleep: (name, duration) => step.sleep(name, duration),
      permanent: (message) => new NonRetryableError(message),
    };

    await runGtmDiagnostic(event.payload, { db: this.env.DB, stages, now: () => new Date().toISOString() }, runner);
  }
}
