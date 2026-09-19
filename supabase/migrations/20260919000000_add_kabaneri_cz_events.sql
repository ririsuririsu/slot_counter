-- カバネリのチャンス目・CZ履歴。従来のカウンターは維持する。
-- 新クライアントの公開前に適用する。旧クライアントのupsertはこの列を変更しない。
ALTER TABLE machine_counters
  ADD COLUMN IF NOT EXISTS kabaneri_events JSONB NOT NULL DEFAULT '[]';
