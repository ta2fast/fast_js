// ==============================
// スコア計算ロジック
// 将来の補正ロジック追加に対応できるよう関数化
// ==============================

import { EvaluationItem, JudgeItemScore, AudienceVote, JudgeScore } from '@/types';

/**
 * ジャッジ点計算（単一ジャッジ）
 * 各項目の「点数 × ウエイト」を合計
 * @param scores 各項目のスコア
 * @param items 評価項目定義
 * @returns 加重計算後の合計点
 */
export function calculateJudgeScore(
    scores: JudgeItemScore[],
    items: EvaluationItem[]
): number {
    return scores.reduce((total, s) => {
        const item = items.find(i => i.id === s.itemId && i.enabled);
        if (!item) return total;
        return total + (s.score * item.weight);
    }, 0);
}

/**
 * ジャッジ点の最大値を計算
 * @param items 評価項目定義
 * @returns 最大点数
 */
export function calculateMaxJudgeScore(items: EvaluationItem[]): number {
    return items
        .filter(item => item.enabled)
        .reduce((total, item) => total + (item.maxScore * item.weight), 0);
}

/**
 * ジャッジ点を100点満点に正規化
 * @param score 元のスコア
 * @param items 評価項目定義
 * @returns 100点満点のスコア
 */
export function normalizeJudgeScore(
    score: number,
    items: EvaluationItem[]
): number {
    const maxScore = calculateMaxJudgeScore(items);
    if (maxScore === 0) return 0;
    return (score / maxScore) * 100;
}

/**
 * 複数ジャッジの平均点を計算
 * @param judgeScores ジャッジスコアの配列
 * @returns 平均点
 */
export function calculateJudgeAverage(judgeScores: JudgeScore[]): number {
    if (judgeScores.length === 0) return 0;
    const total = judgeScores.reduce((sum, js) => sum + js.totalScore, 0);
    return total / judgeScores.length;
}

/**
 * 観客点計算（平均点 × ウエイト）
 * 
 * 【重要】このバージョンでは補正係数を使用しない。
 * 将来、投票者数による補正が必要になった場合は、
 * この関数を修正するか、補正関数を追加する。
 * 
 * @param votes 観客投票の配列
 * @param weight ウエイト（例：2 → 観客点最大10点）
 * @returns 加重後の観客点
 */
export function calculateAudienceScore(
    votes: AudienceVote[],
    weight: number
): number {
    if (votes.length === 0) return 0;

    // 平均点を計算
    const average = calculateAudienceAverage(votes);

    // ウエイトを適用
    return average * weight;
}

/**
 * 観客投票の平均点を計算
 * @param votes 観客投票の配列
 * @returns 平均点（例：4.2）
 */
export function calculateAudienceAverage(votes: AudienceVote[]): number {
    if (votes.length === 0) return 0;
    const totalScore = votes.reduce((sum, v) => sum + v.score, 0);
    return totalScore / votes.length;
}

/**
 * 観客点の最大値を計算
 * @param maxScore 観客投票の最大点数（例：5）
 * @param weight ウエイト（例：2）
 * @returns 観客点の最大値（例：10）
 */
export function calculateMaxAudienceScore(
    maxScore: number,
    weight: number
): number {
    return maxScore * weight;
}

/**
 * 総合点計算
 * ジャッジ点（100点満点）+ 観客点（ウエイト適用後）
 * 
 * @param judgeScore ジャッジ点（100点満点）
 * @param audienceScore 観客点（ウエイト適用後）
 * @returns 総合点
 */
export function calculateTotalScore(
    judgeScore: number,
    audienceScore: number
): number {
    return judgeScore + audienceScore;
}

/**
 * 順位を計算
 * @param results 選手ごとの総合点
 * @returns 順位付きの配列
 */
export function calculateRankings<T extends { totalScore: number }>(
    results: T[]
): (T & { rank: number })[] {
    // 総合点で降順ソート
    const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);

    // 順位を割り当て（同点は同順位）
    let currentRank = 1;
    return sorted.map((result, index) => {
        if (index > 0 && result.totalScore < sorted[index - 1].totalScore) {
            currentRank = index + 1;
        }
        return { ...result, rank: currentRank };
    });
}

/**
 * ウエイトを自動調整して合計100点にする
 * @param items 評価項目
 * @returns 調整後の評価項目
 */
export function normalizeWeights(items: EvaluationItem[]): EvaluationItem[] {
    const enabledItems = items.filter(item => item.enabled);
    const currentTotal = enabledItems.reduce((sum, item) => {
        return sum + (item.maxScore * item.weight);
    }, 0);

    if (currentTotal === 0) return items;

    const scaleFactor = 100 / currentTotal;

    return items.map(item => ({
        ...item,
        weight: item.enabled ? Math.round(item.weight * scaleFactor * 10) / 10 : item.weight
    }));
}

// ==============================
// 将来の補正ロジック追加用のプレースホルダー
// ==============================

/**
 * 【将来用】投票者数による補正係数を計算
 * 現在は使用していない（補正なし）
 * 
 * @param voteCount 投票者数
 * @param baselineCount 基準投票者数
 * @returns 補正係数（現在は常に1.0）
 */
export function calculateVoteCountAdjustment(
    voteCount: number,
    baselineCount: number = 100
): number {
    // 現バージョンでは補正を行わない
    // 将来的に以下のようなロジックを追加可能：
    // return Math.min(1, voteCount / baselineCount);
    // return Math.log(voteCount + 1) / Math.log(baselineCount + 1);

    void voteCount;
    void baselineCount;
    return 1.0;
}

/**
 * 【将来用】補正付き観客点計算
 * @param votes 観客投票の配列
 * @param weight ウエイト
 * @param useAdjustment 補正を使用するか
 * @returns 補正後の観客点
 */
export function calculateAudienceScoreWithAdjustment(
    votes: AudienceVote[],
    weight: number,
    useAdjustment: boolean = false
): number {
    const baseScore = calculateAudienceScore(votes, weight);

    if (!useAdjustment) {
        return baseScore;
    }

    // 将来の補正ロジック
    const adjustment = calculateVoteCountAdjustment(votes.length);
    return baseScore * adjustment;
}
