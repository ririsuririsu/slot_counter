-- ========================================
-- カバネリ海門決戦 機種追加
-- カウンター状態は machine_counters テーブルを共用するため
-- machine_type の CHECK 制約のみ拡張する
-- ========================================

ALTER TABLE machines DROP CONSTRAINT machines_machine_type_check;
ALTER TABLE machines ADD CONSTRAINT machines_machine_type_check
  CHECK (machine_type IN ('monkey-turn-v', 'hokuto-tensei2', 'kabaneri'));
