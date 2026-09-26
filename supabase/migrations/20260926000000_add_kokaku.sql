-- ========================================
-- スマスロ 攻殻機動隊 機種追加
--
-- 現在ゲーム数（進行中サイクルの到達列を決めるのに必要）とイベント列を1行に持つ。
-- events は順序がモード抽選テーブルの切り替えを決めるため配列のまま JSONB で保存する。
--
-- 新クライアントの公開前にこのマイグレーションを適用すること。
-- ========================================

ALTER TABLE machines DROP CONSTRAINT machines_machine_type_check;
ALTER TABLE machines ADD CONSTRAINT machines_machine_type_check
  CHECK (machine_type IN ('monkey-turn-v', 'hokuto-tensei2', 'kabaneri', 'monhan-rise', 'kokaku'));

CREATE TABLE kokaku_state (
  machine_id UUID PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  current_game INTEGER NOT NULL DEFAULT 0,
  events JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kokaku_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on kokaku_state" ON kokaku_state
  FOR ALL USING (true) WITH CHECK (true);
