-- ========================================
-- リコリス・リコイル: 弱リコリス目の2カウンター
--
-- 弱リコリス目（分母）と、そこから変換高確に移行した回数（分子・帯で判断）。
-- 帯は煽りのあとに出るので、2つは独立したカウンターとして別々に押す。
-- 追加のみで既存の行・列には触れない（既存行は 0 で埋まる）。
-- ========================================

ALTER TABLE lycoris_state
  ADD COLUMN weak_lycoris INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN weak_lycoris_koukaku INTEGER NOT NULL DEFAULT 0;
