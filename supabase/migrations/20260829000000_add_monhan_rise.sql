-- ========================================
-- スマスロ モンスターハンターライズ 機種追加
--
-- 軸1のカウンターと軸2〜4のイベント列を1行にまとめて保持する。
-- events は順序が推定に影響する(軸3/軸4 は隠れマルコフ)ため配列のまま JSONB で保存する。
-- ========================================

ALTER TABLE machines DROP CONSTRAINT machines_machine_type_check;
ALTER TABLE machines ADD CONSTRAINT machines_machine_type_check
  CHECK (machine_type IN ('monkey-turn-v', 'hokuto-tensei2', 'kabaneri', 'monhan-rise'));

CREATE TABLE monhan_rise_state (
  machine_id UUID PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  total_games INTEGER NOT NULL DEFAULT 0,
  counters JSONB NOT NULL DEFAULT '{}',
  events JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE monhan_rise_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on monhan_rise_state" ON monhan_rise_state
  FOR ALL USING (true) WITH CHECK (true);
