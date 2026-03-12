-- ========================================
-- Slot Counter: 初期スキーマ
-- ========================================

-- 台の基本情報
CREATE TABLE machines (
  id UUID PRIMARY KEY,
  machine_type TEXT NOT NULL CHECK (machine_type IN ('monkey-turn-v', 'hokuto-tensei2')),
  name TEXT NOT NULL,
  number TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MonkeyTurn: カウンター状態（台ごとに1行、最新状態を保持）
CREATE TABLE machine_counters (
  machine_id UUID PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  total_games INTEGER NOT NULL DEFAULT 0,
  counters JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MonkeyTurn: 履歴エントリ
CREATE TABLE history_entries (
  id UUID PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  total_games INTEGER NOT NULL,
  five_card_total INTEGER NOT NULL,
  probability DOUBLE PRECISION,
  setting_analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 北斗: セッション状態（台ごとに1行）
CREATE TABLE hokuto_state (
  machine_id UUID PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  total_games INTEGER NOT NULL DEFAULT 0,
  total_abeshi INTEGER NOT NULL DEFAULT 0,
  reset_status TEXT NOT NULL DEFAULT 'unknown',
  session_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 北斗: ログ
CREATE TABLE hokuto_logs (
  id UUID PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL,
  log_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- インデックス
-- ========================================

CREATE INDEX idx_history_entries_machine_id ON history_entries(machine_id);
CREATE INDEX idx_history_entries_timestamp ON history_entries(timestamp);
CREATE INDEX idx_hokuto_logs_machine_id ON hokuto_logs(machine_id);
CREATE INDEX idx_hokuto_logs_timestamp ON hokuto_logs(timestamp);

-- ========================================
-- RLS: 認証不要のため全操作を許可
-- ========================================

ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hokuto_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE hokuto_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on machines" ON machines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on machine_counters" ON machine_counters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on history_entries" ON history_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on hokuto_state" ON hokuto_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on hokuto_logs" ON hokuto_logs FOR ALL USING (true) WITH CHECK (true);
