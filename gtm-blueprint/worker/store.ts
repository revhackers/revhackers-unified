// Acesso ao D1. Cada função é uma consulta; regras de transição de status ficam no SQL, onde o WHERE as torna atômicas.

export type DiagnosticStatus = 'coletando' | 'aguardando_contato' | 'gerando' | 'pronto' | 'falhou';

export interface DiagnosticRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: DiagnosticStatus;
  error_code: string | null;
  input_json: string;
  ip_hash: string;
  unlocked_at: string | null;
}

/** Linha gravada quando um estágio falha de forma definitiva. */
export interface FailedStage {
  failed: true;
  error: string;
}

export function isFailedStage(value: unknown): value is FailedStage {
  return typeof value === 'object' && value !== null && 'failed' in value && value.failed === true;
}

export async function insertDiagnostic(
  db: D1Database,
  row: { id: string; now: string; inputJson: string; ipHash: string },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO diagnostics (id, created_at, updated_at, status, error_code, input_json, ip_hash, unlocked_at) VALUES (?, ?, ?, 'coletando', NULL, ?, ?, NULL)",
    )
    .bind(row.id, row.now, row.now, row.inputJson, row.ipHash)
    .run();
}

export async function countRecentDiagnostics(db: D1Database, ipHash: string, sinceIso: string): Promise<{ total: number; porIp: number }> {
  const row = await db
    .prepare('SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN ip_hash = ? THEN 1 ELSE 0 END), 0) AS porIp FROM diagnostics WHERE created_at >= ?')
    .bind(ipHash, sinceIso)
    .first<{ total: number; porIp: number }>();
  return { total: Number(row?.total ?? 0), porIp: Number(row?.porIp ?? 0) };
}

export async function getDiagnostic(db: D1Database, id: string): Promise<DiagnosticRow | null> {
  return db.prepare('SELECT * FROM diagnostics WHERE id = ?').bind(id).first<DiagnosticRow>();
}

/** Registra o desbloqueio (primeiro vence) e, se ainda aguardava contato, passa a gerando. */
export async function unlockDiagnostic(db: D1Database, id: string, nowIso: string): Promise<void> {
  await db
    .prepare(
      "UPDATE diagnostics SET unlocked_at = COALESCE(unlocked_at, ?), status = CASE WHEN status = 'aguardando_contato' THEN 'gerando' ELSE status END, updated_at = ? WHERE id = ?",
    )
    .bind(nowIso, nowIso, id)
    .run();
}

export async function saveStage(db: D1Database, diagnosticId: string, stage: string, output: unknown, nowIso: string): Promise<void> {
  await db
    .prepare('INSERT OR REPLACE INTO diagnostic_stages (diagnostic_id, stage, output_json, created_at) VALUES (?, ?, ?, ?)')
    .bind(diagnosticId, stage, JSON.stringify(output), nowIso)
    .run();
}

export async function loadStage<T>(db: D1Database, diagnosticId: string, stage: string): Promise<T | null> {
  const row = await db
    .prepare('SELECT output_json FROM diagnostic_stages WHERE diagnostic_id = ? AND stage = ?')
    .bind(diagnosticId, stage)
    .first<{ output_json: string }>();
  return row ? (JSON.parse(row.output_json) as T) : null;
}

export async function listStages(db: D1Database, diagnosticId: string): Promise<Array<{ stage: string; output: unknown }>> {
  const { results } = await db
    .prepare('SELECT stage, output_json FROM diagnostic_stages WHERE diagnostic_id = ?')
    .bind(diagnosticId)
    .all<{ stage: string; output_json: string }>();
  return results.map((row) => ({ stage: row.stage, output: JSON.parse(row.output_json) as unknown }));
}

/** Coleta terminou: aguarda contato, ou segue direto para gerando se o lead já desbloqueou durante a coleta. */
export async function releaseAfterCollect(db: D1Database, id: string, nowIso: string): Promise<void> {
  await db
    .prepare(
      "UPDATE diagnostics SET status = CASE WHEN unlocked_at IS NULL THEN 'aguardando_contato' ELSE 'gerando' END, updated_at = ? WHERE id = ? AND status = 'coletando'",
    )
    .bind(nowIso, id)
    .run();
}

export async function markReady(db: D1Database, id: string, nowIso: string): Promise<void> {
  await db.prepare("UPDATE diagnostics SET status = 'pronto', updated_at = ? WHERE id = ? AND status = 'gerando'").bind(nowIso, id).run();
}

/** Falha só sobrescreve diagnóstico ainda em andamento: uma falha anterior não é trocada por outra. */
export async function markFailed(db: D1Database, id: string, errorCode: string, nowIso: string): Promise<void> {
  await db
    .prepare(
      "UPDATE diagnostics SET status = 'falhou', error_code = ?, updated_at = ? WHERE id = ? AND status IN ('coletando', 'aguardando_contato', 'gerando')",
    )
    .bind(errorCode, nowIso, id)
    .run();
}
