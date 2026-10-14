import type { QueryablePool } from '../../db/postgres';
import type {
  REIOnboardingRecord,
  CreateREIOnboardingParams,
  OrchestratedOnboardingPhase,
  HormoziMilestone,
  QuickWinPayload,
} from './types';

export interface ExpansionSuggestion {
  product_name: string;
  product_description?: string;
  estimated_value_brl?: number;
  ai_reasoning?: string;
  opportunity_type?: 'upsell' | 'cross_sell' | 'renewal' | 'expansion_service' | 'referral';
}

export class PostgresREIRepository {
  constructor(private readonly pool: QueryablePool) {}

  async createOnboarding(params: CreateREIOnboardingParams): Promise<REIOnboardingRecord> {
    const result = await this.pool.query(
      `INSERT INTO rei_onboarding (
        rei_project_id, client_name, client_email, client_company,
        product_name, product_slug, company_slug,
        duration_days, type, avg_ticket_range,
        cs_lead_name, cs_lead_email, backup_name, backup_email,
        current_phase, current_milestone,
        health_score, engagement_rate, churn_risk,
        founder_intervention_required, notes, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
      RETURNING *`,
      [
        params.rei_project_id,
        params.client_name,
        params.client_email,
        params.client_company,
        params.product_name,
        params.product_slug ?? params.product_name.toLowerCase().replace(/\s+/g, '-'),
        params.company_slug ?? params.client_company.toLowerCase().replace(/\s+/g, '-'),
        params.duration_days ?? 30,
        params.type ?? 'guided',
        params.avg_ticket_range ?? '5k-30k',
        params.cs_lead_name,
        params.cs_lead_email,
        params.backup_name ?? null,
        params.backup_email ?? null,
        'O1_EMBARK' as OrchestratedOnboardingPhase,
        'M0_WELCOME' as HormoziMilestone,
        100,
        0,
        'low',
        params.is_high_ticket ?? false,
        null,
      ]
    );
    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<REIOnboardingRecord | null> {
    const result = await this.pool.query(
      `SELECT * FROM rei_onboarding WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByReiProjectId(reiProjectId: string): Promise<REIOnboardingRecord | null> {
    const result = await this.pool.query(
      `SELECT * FROM rei_onboarding WHERE rei_project_id = $1 LIMIT 1`,
      [reiProjectId]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async markWelcomeSent(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE rei_onboarding
       SET welcome_sent_at = NOW(),
           current_milestone = 'M1_KICKOFF',
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async markKickoff(id: string, goalSentence: string): Promise<void> {
    await this.pool.query(
      `UPDATE rei_onboarding
       SET kickoff_at = NOW(),
           current_milestone = 'M2_QUICK_WIN',
           current_phase = 'O3_KICKOFF',
           notes = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [id, goalSentence]
    );
  }

  async deliverQuickWin(id: string, payload: QuickWinPayload): Promise<void> {
    await this.pool.query(
      `UPDATE rei_onboarding
       SET quick_win_delivered_at = NOW(),
           current_milestone = 'M3_NPS_D14',
           current_phase = 'O4_ADOPT',
           quick_win_description = $2,
           quick_win_url = $3,
           quick_win_loom_url = $4,
           health_score = GREATEST(health_score, 85),
           updated_at = NOW()
       WHERE id = $1`,
      [id, payload.description, payload.url, payload.loom_url ?? null]
    );
  }

  async recordNPS(id: string, score: number): Promise<void> {
    await this.pool.query(
      `UPDATE rei_onboarding
       SET nps_d14_score = $2,
           churn_risk = CASE WHEN $2 < 7 THEN 'high' WHEN $2 < 8 THEN 'medium' ELSE 'low' END,
           updated_at = NOW()
       WHERE id = $1`,
      [id, score]
    );
  }

  async createExpansionOpportunity(params: {
    tenant_id: string;
    rei_onboarding_id: string | null;
    project_id: string | null;
    opportunity_type: 'upsell' | 'cross_sell' | 'renewal' | 'expansion_service' | 'referral';
    product_name: string;
    product_description: string | null;
    estimated_value_brl: number | null;
    ai_reasoning: string | null;
    created_by: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO app.rei_expansion_opportunities (
        tenant_id, rei_onboarding_id, project_id, opportunity_type,
        product_name, product_description, estimated_value_brl, ai_reasoning, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.tenant_id, params.rei_onboarding_id, params.project_id, params.opportunity_type,
        params.product_name, params.product_description, params.estimated_value_brl,
        params.ai_reasoning, params.created_by,
      ]
    );
  }

  async listExpansionOpportunities(tenantId: string, options?: { onboarding_id?: string; status?: string; limit?: number }): Promise<any[]> {
    const limit = options?.limit || 50;
    let query = `SELECT * FROM app.rei_expansion_opportunities WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    if (options?.onboarding_id) {
      params.push(options.onboarding_id);
      query += ` AND rei_onboarding_id = $${params.length}`;
    }
    if (options?.status) {
      params.push(options.status);
      query += ` AND status = $${params.length}`;
    }
    query += ` ORDER BY estimated_value_brl DESC NULLS LAST, created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async listActive(tenantId: string): Promise<REIOnboardingRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM rei_onboarding
       WHERE current_milestone != 'COMPLETED'
         AND tenant_id = $1
       ORDER BY kickoff_at DESC NULLS LAST, created_at DESC`,
      [tenantId]
    );
    return result.rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: any): REIOnboardingRecord {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      rei_project_id: row.rei_project_id,
      client_name: row.client_name,
      client_email: row.client_email,
      client_company: row.client_company,
      product_name: row.product_name,
      product_slug: row.product_slug,
      company_slug: row.company_slug,
      duration_days: row.duration_days,
      type: row.type,
      avg_ticket_range: row.avg_ticket_range,
      cs_lead_name: row.cs_lead_name,
      cs_lead_email: row.cs_lead_email,
      backup_name: row.backup_name,
      backup_email: row.backup_email,
      current_phase: row.current_phase,
      current_milestone: row.current_milestone,
      welcome_sent_at: row.welcome_sent_at,
      kickoff_at: row.kickoff_at,
      quick_win_delivered_at: row.quick_win_delivered_at,
      nps_d14_score: row.nps_d14_score,
      mid_review_at: row.mid_review_at,
      wrap_up_at: row.wrap_up_at,
      completed_at: row.completed_at,
      quick_win_description: row.quick_win_description,
      quick_win_url: row.quick_win_url,
      quick_win_loom_url: row.quick_win_loom_url,
      health_score: row.health_score,
      engagement_rate: parseFloat(row.engagement_rate),
      churn_risk: row.churn_risk,
      founder_intervention_required: row.founder_intervention_required,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}