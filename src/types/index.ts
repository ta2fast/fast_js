// ==============================
// BMX Flatland Judge & Voting App
// Data Types Definition
// ==============================

// 選手データ
export interface Rider {
  id: string;
  name: string;
  riderName: string;  // ライダーネーム（表示名）
  displayOrder: number; // 出走順
  createdAt: string;
}

// 評価項目（カスタマイズ可能）
export interface EvaluationItem {
  id: string;
  name: string;        // 項目名（例：メイク率）
  weight: number;      // ウエイト（例：5）
  minScore: number;    // 最小点数（例：1）
  maxScore: number;    // 最大点数（例：5）
  order: number;       // 表示順
  enabled: boolean;    // 有効/無効
}

// ジャッジの個別スコア
export interface JudgeItemScore {
  itemId: string;
  score: number;
}

// ジャッジスコア（送信データ）
export interface JudgeScore {
  id: string;
  judgeId: string;
  riderId: string;
  scores: JudgeItemScore[];
  totalScore: number;     // 加重計算後の合計点
  submittedAt: string;
  locked: boolean;
}

// 観客投票
export interface AudienceVote {
  id: string;
  riderId: string;
  score: number;          // 1-5点
  deviceId: string;       // 端末ID（フィンガープリント）
  ip: string;
  userAgent: string;
  timestamp: string;
  canModifyUntil?: string; // 変更可能期限
}

// 大会設定
export interface ContestSettings {
  id: string;
  evaluationItems: EvaluationItem[];
  audienceWeight: number;       // 観客点ウエイト（例：2 → 最大10点）
  audienceMinScore: number;     // 観客投票の最小点数
  audienceMaxScore: number;     // 観客投票の最大点数
  votingEnabled: boolean;       // 投票開始/終了フラグ
  votingDeadlineSeconds: number; // ラン終了後の投票可能秒数
  allowVoteModification: boolean; // 投票変更を許可するか
  modificationWindowSeconds: number; // 変更可能な秒数（例：10秒）
  currentRiderId: string | null; // 現在パフォーマンス中の選手
  contestName: string;
  contestDate: string;
}

// 選手ごとの集計結果
export interface RiderResult {
  riderId: string;
  rider: Rider;
  judgeScores: JudgeScore[];
  judgeAverage: number;         // ジャッジ平均点（100点満点）
  audienceVotes: AudienceVote[];
  audienceAverage: number;      // 観客平均点（5点満点）
  audienceWeightedScore: number; // 観客点 × ウエイト
  totalScore: number;           // 総合点
  rank: number;
  isFinalized: boolean;         // 確定済みかどうか
}

// 投票状態
export interface VotingState {
  isOpen: boolean;
  currentRiderId: string | null;
  deadlineTimestamp: string | null;
  remainingSeconds: number;
}

// ジャッジ情報
export interface Judge {
  id: string;
  name: string;
  isActive: boolean;
}

// ログエントリ
export interface LogEntry {
  id: string;
  type: 'judge_score' | 'audience_vote' | 'setting_change' | 'voting_control';
  action: string;
  data: Record<string, unknown>;
  timestamp: string;
  userId?: string;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// デフォルトの評価項目
export const DEFAULT_EVALUATION_ITEMS: EvaluationItem[] = [
  { id: 'make_rate', name: 'メイク率', weight: 5, minScore: 1, maxScore: 5, order: 1, enabled: true },
  { id: 'difficulty', name: '技の難易度', weight: 3, minScore: 1, maxScore: 5, order: 2, enabled: true },
  { id: 'aggressiveness', name: '積極性', weight: 2, minScore: 1, maxScore: 5, order: 3, enabled: true },
  { id: 'stability', name: '安定感', weight: 3, minScore: 1, maxScore: 5, order: 4, enabled: true },
  { id: 'impact', name: 'インパクト', weight: 3, minScore: 1, maxScore: 5, order: 5, enabled: true },
  { id: 'composition', name: '全体構成', weight: 4, minScore: 1, maxScore: 5, order: 6, enabled: true },
];

// デフォルトの大会設定
export const DEFAULT_CONTEST_SETTINGS: ContestSettings = {
  id: 'default',
  evaluationItems: DEFAULT_EVALUATION_ITEMS,
  audienceWeight: 2,
  audienceMinScore: 1,
  audienceMaxScore: 5,
  votingEnabled: false,
  votingDeadlineSeconds: 30,
  allowVoteModification: true,
  modificationWindowSeconds: 10,
  currentRiderId: null,
  contestName: 'BMX Flatland Contest',
  contestDate: new Date().toISOString().split('T')[0],
};
