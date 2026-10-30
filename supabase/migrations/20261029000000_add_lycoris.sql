-- ========================================
-- スマスロ リコリス・リコイル 機種追加
--
-- 共通ベルの回数・打ち始めG・現在G（サブ液晶のAT間G）とイベント列を1行に持つ。
-- events は AT 当選でサイクルが切れるため、順序を保ったまま JSONB で保存する。
--
-- 新クライアントの公開前にこのマイグレーションを適用すること。
-- ========================================

ALTER TABLE machines DROP CONSTRAINT machines_machine_type_check;
ALTER TABLE machines ADD CONSTRAINT machines_machine_type_check
  CHECK (machine_type IN ('monkey-turn-v', 'hokuto-tensei2', 'kabaneri', 'monhan-rise', 'kokaku', 'lycoris-recoil'));

CREATE TABLE lycoris_state (
  machine_id UUID PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  bell INTEGER NOT NULL DEFAULT 0,
  start_game INTEGER NOT NULL DEFAULT 0,
  current_game INTEGER NOT NULL DEFAULT 0,
  events JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lycoris_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on lycoris_state" ON lycoris_state
  FOR ALL USING (true) WITH CHECK (true);
