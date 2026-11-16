import { handleGtmApi } from './api.js';

// A classe precisa ser exportada pelo módulo principal: é o `class_name` do binding em wrangler.jsonc.
export { GtmDiagnosticWorkflow } from './workflow.js';

export default {
  fetch: (request: Request, env: Env): Promise<Response> => handleGtmApi(request, env),
} satisfies ExportedHandler<Env>;
