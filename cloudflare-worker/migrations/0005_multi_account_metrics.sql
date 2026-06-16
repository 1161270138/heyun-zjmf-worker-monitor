ALTER TABLE servers ADD COLUMN host_id TEXT NOT NULL DEFAULT '';
UPDATE servers SET host_id = id WHERE host_id = '';

ALTER TABLE check_results ADD COLUMN metrics_json TEXT NOT NULL DEFAULT '{}';
