CREATE TABLE diagnostics (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('coletando','aguardando_contato','gerando','pronto','falhou')),
  error_code TEXT, input_json TEXT NOT NULL, ip_hash TEXT NOT NULL, unlocked_at TEXT
);
CREATE INDEX idx_diagnostics_created ON diagnostics (created_at);
CREATE INDEX idx_diagnostics_ip ON diagnostics (ip_hash, created_at);
CREATE TABLE diagnostic_stages (
  diagnostic_id TEXT NOT NULL, stage TEXT NOT NULL, output_json TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (diagnostic_id, stage)
);
