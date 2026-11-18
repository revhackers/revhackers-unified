import { authenticatedRequest } from './_base';
import type { FrameworkResult, GrowthMapState } from '@/types/growthmap';

interface GrowthMapResponse {
  projectId: string;
  companyName: string;
  companyDescription: string;
  reiScore: number | null;
  growthmapScore: number | null;
  reiConnectionsCount: number;
  frameworks: Record<string, FrameworkResult>;
  generatedAt: string | null;
}

async function request(projectId: string, init?: RequestInit): Promise<Response> {
  return authenticatedRequest(`/v1/growthmaps/${encodeURIComponent(projectId)}`, init);
}

function toState(value: GrowthMapResponse): GrowthMapState {
  return {
    project_id: value.projectId,
    company_name: value.companyName,
    company_description: value.companyDescription,
    ...(value.generatedAt ? { generated_at: value.generatedAt } : {}),
    ...(value.reiScore !== null ? { rei_score: value.reiScore } : {}),
    ...(value.growthmapScore !== null ? { growthmap_score: value.growthmapScore } : {}),
    rei_connections_count: value.reiConnectionsCount,
    frameworks: value.frameworks,
  };
}

export const growthMapGcpDataAdapter = {
  async load(projectId: string): Promise<GrowthMapState | null> {
    const value = await (await request(projectId)).json() as GrowthMapResponse | null;
    return value ? toState(value) : null;
  },

  async save(projectId: string, framework: FrameworkResult): Promise<void> {
    const current = await this.load(projectId);
    const payload = {
      companyName: current?.company_name ?? '',
      companyDescription: current?.company_description ?? '',
      reiScore: current?.rei_score ?? null,
      growthmapScore: current?.growthmap_score ?? null,
      reiConnectionsCount: current?.rei_connections_count ?? 0,
      frameworks: { ...(current?.frameworks ?? {}), [framework.id]: framework },
      generatedAt: framework.generated_at ?? current?.generated_at ?? null,
    };
    await request(projectId, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });
  },
};
