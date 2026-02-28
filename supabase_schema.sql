-- ==============================
-- FastJudge Supabase Schema
-- BMX Flatland Judge & Voting App
-- ==============================

-- 選手テーブル
CREATE TABLE riders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rider_name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ジャッジテーブル
CREATE TABLE judges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ジャッジ採点テーブル
CREATE TABLE judge_scores (
    id TEXT PRIMARY KEY,
    judge_id TEXT NOT NULL REFERENCES judges(id),
    rider_id TEXT NOT NULL REFERENCES riders(id),
    scores JSONB NOT NULL, -- JudgeItemScore[]
    total_score NUMERIC NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    locked BOOLEAN DEFAULT TRUE
);

-- 観客投票テーブル
CREATE TABLE audience_votes (
    id TEXT PRIMARY KEY,
    rider_id TEXT NOT NULL REFERENCES riders(id),
    score INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    ip TEXT DEFAULT 'unknown',
    user_agent TEXT DEFAULT 'unknown',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    can_modify_until TIMESTAMPTZ
);

-- 大会設定テーブル
CREATE TABLE contest_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    evaluation_items JSONB NOT NULL,
    audience_weight NUMERIC DEFAULT 2,
    audience_min_score INTEGER DEFAULT 1,
    audience_max_score INTEGER DEFAULT 5,
    voting_enabled BOOLEAN DEFAULT FALSE,
    voting_deadline_seconds INTEGER DEFAULT 30,
    allow_vote_modification BOOLEAN DEFAULT TRUE,
    modification_window_seconds INTEGER DEFAULT 10,
    current_rider_id TEXT,
    contest_name TEXT DEFAULT 'BMX Flatland Contest',
    contest_date DATE DEFAULT CURRENT_DATE,
    revealed_item_ids JSONB DEFAULT '[]'::jsonb,
    animation_delay_score_ms INTEGER DEFAULT 2000,
    animation_delay_rank_ms INTEGER DEFAULT 2000,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ログテーブル
CREATE TABLE logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    action TEXT NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT
);

-- インデックス
CREATE INDEX idx_judge_scores_rider ON judge_scores(rider_id);
CREATE INDEX idx_judge_scores_judge ON judge_scores(judge_id);
CREATE INDEX idx_audience_votes_rider ON audience_votes(rider_id);
CREATE INDEX idx_audience_votes_device ON audience_votes(device_id);
CREATE INDEX idx_logs_type ON logs(type);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);

-- 同一端末・同一選手への重複投票を防ぐユニーク制約
CREATE UNIQUE INDEX idx_unique_vote ON audience_votes(device_id, rider_id);

-- 同一ジャッジ・同一選手への重複採点を防ぐユニーク制約
CREATE UNIQUE INDEX idx_unique_judge_score ON judge_scores(judge_id, rider_id);

-- デフォルトのジャッジ3名を挿入
INSERT INTO judges (id, name, is_active) VALUES
    ('judge1', 'ジャッジ1', true),
    ('judge2', 'ジャッジ2', true),
    ('judge3', 'ジャッジ3', true);

-- デフォルトの大会設定を挿入
INSERT INTO contest_settings (id, evaluation_items) VALUES (
    'default',
    '[
        {"id": "make_rate", "name": "メイク率", "weight": 5, "minScore": 1, "maxScore": 5, "order": 1, "enabled": true},
        {"id": "difficulty", "name": "技の難易度", "weight": 3, "minScore": 1, "maxScore": 5, "order": 2, "enabled": true},
        {"id": "aggressiveness", "name": "積極性", "weight": 2, "minScore": 1, "maxScore": 5, "order": 3, "enabled": true},
        {"id": "stability", "name": "安定感", "weight": 3, "minScore": 1, "maxScore": 5, "order": 4, "enabled": true},
        {"id": "impact", "name": "インパクト", "weight": 3, "minScore": 1, "maxScore": 5, "order": 5, "enabled": true},
        {"id": "composition", "name": "全体構成", "weight": 4, "minScore": 1, "maxScore": 5, "order": 6, "enabled": true}
    ]'::jsonb
);

-- アニメーション設定テーブル（リザルト画面用）
CREATE TABLE IF NOT EXISTS animation_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    label_display_time NUMERIC DEFAULT 3.0,
    bar_transition_speed NUMERIC DEFAULT 3.0,
    sort_delay_time NUMERIC DEFAULT 3.0,
    sort_transition_speed NUMERIC DEFAULT 0.8,
    animation_style TEXT DEFAULT 'Standard',
    label_font_size TEXT DEFAULT 'Medium',
    is_running BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_row CHECK (id = 1)
);

-- RLS を有効化
ALTER TABLE animation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON animation_settings FOR ALL USING (true) WITH CHECK (true);

-- 全テーブルに公開アクセスを許可するポリシー
CREATE POLICY "Allow public access" ON riders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON judges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON judge_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON audience_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON contest_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON logs FOR ALL USING (true) WITH CHECK (true);
