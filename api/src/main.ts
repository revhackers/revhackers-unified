import { loadConfig } from './config';
import { PostgresIdempotencyStore } from './context/postgres-idempotency-store';
import { loadDatabaseConfig } from './db/config';
import { checkPostgresReady, createPostgresResources } from './db/postgres';
import { PostgresClientRepository } from './domains/clients/postgres-repository';
import { ClientService } from './domains/clients/service';
import { PostgresContentRepository } from './domains/content/postgres-repository';
import { ContentService } from './domains/content/service';
import { PostgresGrowthMapRepository } from './domains/growthmap/postgres-repository';
import { GrowthMapService } from './domains/growthmap/service';
import { PostgresReiProjectRepository } from './domains/rei-projects/postgres-repository';
import { ReiProjectService } from './domains/rei-projects/service';
import { PostgresStrategicPlanRepository } from './domains/strategic-plans/postgres-repository';
import { StrategicPlanService } from './domains/strategic-plans/service';
import { PostgresOpportunityRepository } from './domains/opportunities/postgres-repository';
import { FonteDataService } from './domains/opportunities/fontedata-service';
import { createClientsRoutes } from './http/clients-routes';
import { createContentRoutes } from './http/content-routes';
import { createGrowthMapRoutes } from './http/growthmap-routes';
import { createIdentityRoutes } from './http/identity-routes';
import { createOpportunitiesRoutes } from './http/opportunities-routes';
import { createReiProjectsRoutes } from './http/rei-projects-routes';
import { createStrategicPlansRoutes } from './http/strategic-plans-http-routes';
import { GoogleIdentityTokenVerifier } from './identity/google-identity-verifier';
import { PostgresIdentityRepository } from './identity/postgres-identity-repository';
import { createApiServer } from './server';
import { createAuthRoutes } from './http/auth-routes';
import { createAiRoutes } from './http/ai-routes';
import { AuthMiddleware } from './http/auth-middleware';

import { PostgresFinanceRepository } from './domains/finance/postgres-repository';
import { InfinitePayConnector } from './domains/finance/connectors/infinitepay-connector';
import { PagBankConnector } from './domains/finance/connectors/pagbank-connector';
import { PluggyConnector } from './domains/finance/connectors/pluggy-connector';
import { StripeConnector } from './domains/finance/connectors/stripe-connector';
import { createFinanceRoutes } from './http/finance-routes';
import { PostgresREIRepository } from './domains/rei/postgres-repository';
import { createREIRoutes } from './http/rei-routes';
import { PostgresIntelligenceRepository } from './domains/intelligence/postgres-repository';
import { PostgresIntelligenceJobsRepository } from './domains/intelligence/postgres-repository-jobs';
import { FonteDataIntelligenceConnector } from './domains/intelligence/fonte-data-connector';
import { createIntelligenceRoutes } from './http/intelligence-routes';

import {
  handleProcessLifecycle,
  handleCalendarWebhook,
  handleGHLWebhook,
  handleListHooks,
  handleCreateHook,
  handleContactJourney,
} from './http/lifecycle-routes';

async function main(): Promise<void> {
  const config = loadConfig();
  const databaseConfig = loadDatabaseConfig();
  const postgres = await createPostgresResources(databaseConfig);
  const googleProjectId = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (!googleProjectId) throw new Error('GOOGLE_CLOUD_PROJECT is required.');
  const verifier = new GoogleIdentityTokenVerifier({ projectId: googleProjectId });
  const identities = new PostgresIdentityRepository(postgres.pool);

  const opportunityRepository = new PostgresOpportunityRepository(postgres.pool);
  const financeRepository = new PostgresFinanceRepository(postgres.pool);
  const reiRepository = new PostgresREIRepository(postgres.pool);
  const intelligenceRepository = new PostgresIntelligenceRepository(postgres.pool);
  const intelligenceJobsRepository = new PostgresIntelligenceJobsRepository(postgres.pool);
  const fonteDataConnector = new FonteDataIntelligenceConnector();
  const fonteDataService = new FonteDataService();

  const contentRepository = new PostgresContentRepository(postgres.pool);
  const contentService = new ContentService(contentRepository);

  const identityRoutes = createIdentityRoutes({ verifier, identities });
  const intelligenceRoutes = createIntelligenceRoutes({
    repository: intelligenceRepository,
    jobsRepository: intelligenceJobsRepository,
    fonteDataConnector,
    verifier,
    identities,
  });
  const reiRoutes = createREIRoutes({ repository: reiRepository, verifier, identities });
  const financeRoutes = createFinanceRoutes({
    repository: financeRepository,
    verifier,
    identities,
    connectors: {
      stripe: new StripeConnector(),
      infinitepay: new InfinitePayConnector(),
      pagbank: new PagBankConnector(),
      pluggy: new PluggyConnector(),
    },
  });
  const opportunityRoutes = createOpportunitiesRoutes({
    repository: opportunityRepository,
    fonteDataService,
  });
  const clientRoutes = createClientsRoutes({
    verifier,
    identities,
    service: new ClientService(new PostgresClientRepository(postgres.pool)),
  });
  const reiProjectRoutes = createReiProjectsRoutes({
    verifier,
    identities,
    service: new ReiProjectService(new PostgresReiProjectRepository(postgres.pool)),
  });
  const strategicPlanRoutes = createStrategicPlansRoutes({
    verifier,
    identities,
    service: new StrategicPlanService(new PostgresStrategicPlanRepository(postgres.pool)),
  });
  const growthMapRoutes = createGrowthMapRoutes({
    verifier,
    identities,
    service: new GrowthMapService(new PostgresGrowthMapRepository(postgres.pool)),
    idempotency: new PostgresIdempotencyStore(postgres.pool),
  });
  const contentRoutes = createContentRoutes({
    service: contentService,
    verifier,
    identities,
  });

  const envVars = process.env as Record<string, string>;
  const authMiddleware = new AuthMiddleware({ verifier, identities });
  const lifecycleRoute = async (request: Request) =>
    (await handleProcessLifecycle(request, envVars, postgres.pool as any)) ??
    (await handleCalendarWebhook(request, envVars, postgres.pool as any)) ??
    (await handleGHLWebhook(request, envVars, postgres.pool as any)) ??
    (await handleListHooks(request, envVars, postgres.pool as any, { auth: authMiddleware })) ??
    (await handleCreateHook(request, envVars, postgres.pool as any, { auth: authMiddleware })) ??
    (await handleContactJourney(request, envVars, postgres.pool as any, { auth: authMiddleware })) ??
    null;

  const authRoutes = createAuthRoutes({ pool: postgres.pool });
  const aiRoutes = createAiRoutes({ auth: authMiddleware, pool: postgres.pool });

  const route = async (request: Request, requestId: string) =>
    (await authRoutes(request)) ??
    (await lifecycleRoute(request)) ??
    (await intelligenceRoutes(request)) ??
    (await reiRoutes(request)) ??
    (await financeRoutes(request)) ??
    (await opportunityRoutes(request)) ??
    (await identityRoutes(request)) ??
    (await clientRoutes(request)) ??
    (await reiProjectRoutes(request)) ??
    (await strategicPlanRoutes(request)) ??
    (await growthMapRoutes(request, requestId)) ??
    (await contentRoutes(request)) ??
    (await aiRoutes(request));

  const api = createApiServer(config, undefined, {
    route,
    readiness: async () => {
      try {
        return { ready: await checkPostgresReady(postgres.pool) };
      } catch {
        return { ready: false, reason: 'postgres_unavailable' };
      }
    },
    close: () => postgres.close(),
  });

  api.server.listen(config.port, '0.0.0.0', () => {
    console.log(JSON.stringify({
      severity: 'INFO',
      event: 'server_started',
      service: config.service,
      version: config.version,
      environment: config.environment,
      port: config.port,
    }));
  });

  let shutdownStarted = false;
  const handleSignal = async (signal: NodeJS.Signals) => {
    if (shutdownStarted) return;
    shutdownStarted = true;
    console.log(JSON.stringify({ severity: 'INFO', event: 'shutdown_started', signal }));
    try {
      await api.shutdown();
      console.log(JSON.stringify({ severity: 'INFO', event: 'shutdown_completed' }));
      process.exitCode = 0;
    } catch (error) {
      console.error(JSON.stringify({
        severity: 'ERROR',
        event: 'shutdown_failed',
        error: error instanceof Error ? error.message : 'unknown',
      }));
      process.exitCode = 1;
    }
  };

  process.once('SIGTERM', () => void handleSignal('SIGTERM'));
  process.once('SIGINT', () => void handleSignal('SIGINT'));
}

void main().catch((error: unknown) => {
  console.error(JSON.stringify({
    severity: 'CRITICAL',
    event: 'startup_failed',
    error: error instanceof Error ? error.message : 'unknown',
  }));
  process.exitCode = 1;
});
