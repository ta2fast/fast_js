// ==============================
// データストア（サーバーサイド）
// メモリ + JSONファイル永続化
// ==============================

import {
    Rider,
    JudgeScore,
    AudienceVote,
    ContestSettings,
    Judge,
    LogEntry,
    DEFAULT_CONTEST_SETTINGS
} from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// メモリキャッシュ
let riders: Rider[] = [];
let judgeScores: JudgeScore[] = [];
let audienceVotes: AudienceVote[] = [];
let contestSettings: ContestSettings = { ...DEFAULT_CONTEST_SETTINGS };
let judges: Judge[] = [];
let logs: LogEntry[] = [];
let initialized = false;

// データディレクトリの確認・作成
async function ensureDataDir(): Promise<void> {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// JSONファイルからデータを読み込み
async function loadData<T>(filename: string, defaultValue: T): Promise<T> {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data) as T;
    } catch {
        return defaultValue;
    }
}

// JSONファイルにデータを保存
async function saveData<T>(filename: string, data: T): Promise<void> {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 初期化
export async function initializeStore(): Promise<void> {
    if (initialized) return;

    await ensureDataDir();

    riders = await loadData<Rider[]>('riders.json', []);
    judgeScores = await loadData<JudgeScore[]>('judge_scores.json', []);
    audienceVotes = await loadData<AudienceVote[]>('audience_votes.json', []);
    contestSettings = await loadData<ContestSettings>('settings.json', { ...DEFAULT_CONTEST_SETTINGS });
    judges = await loadData<Judge[]>('judges.json', [
        { id: 'judge1', name: 'ジャッジ1', isActive: true },
        { id: 'judge2', name: 'ジャッジ2', isActive: true },
        { id: 'judge3', name: 'ジャッジ3', isActive: true },
    ]);
    logs = await loadData<LogEntry[]>('logs.json', []);

    initialized = true;
}

// ==============================
// Riders
// ==============================

export async function getRiders(): Promise<Rider[]> {
    await initializeStore();
    return riders.map(rider => ({
        ...rider,
        riderName: rider.riderName || rider.name, // 既存データ対応
    }));
}

export async function getRider(id: string): Promise<Rider | undefined> {
    await initializeStore();
    const rider = riders.find(r => r.id === id);
    return rider ? { ...rider, riderName: rider.riderName || rider.name } : undefined;
}

export async function createRider(rider: Omit<Rider, 'id' | 'createdAt'>): Promise<Rider> {
    await initializeStore();
    const newRider: Rider = {
        ...rider,
        id: `rider_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
    };
    riders.push(newRider);
    await saveData('riders.json', riders);
    await addLog('setting_change', 'Rider created', { rider: newRider });
    return newRider;
}

export async function updateRider(id: string, updates: Partial<Rider>): Promise<Rider | null> {
    await initializeStore();
    const index = riders.findIndex(r => r.id === id);
    if (index === -1) return null;

    riders[index] = { ...riders[index], ...updates, id };
    await saveData('riders.json', riders);
    await addLog('setting_change', 'Rider updated', { rider: riders[index] });
    return riders[index];
}

export async function deleteRider(id: string): Promise<boolean> {
    await initializeStore();
    const index = riders.findIndex(r => r.id === id);
    if (index === -1) return false;

    const deleted = riders.splice(index, 1)[0];
    await saveData('riders.json', riders);
    await addLog('setting_change', 'Rider deleted', { rider: deleted });
    return true;
}

// ==============================
// Judge Scores
// ==============================

export async function getJudgeScores(): Promise<JudgeScore[]> {
    await initializeStore();
    return judgeScores;
}

export async function getJudgeScoresForRider(riderId: string): Promise<JudgeScore[]> {
    await initializeStore();
    return judgeScores.filter(s => s.riderId === riderId);
}

export async function hasJudgeScored(judgeId: string, riderId: string): Promise<boolean> {
    await initializeStore();
    return judgeScores.some(s => s.judgeId === judgeId && s.riderId === riderId);
}

export async function submitJudgeScore(score: Omit<JudgeScore, 'id' | 'submittedAt' | 'locked'>): Promise<JudgeScore> {
    await initializeStore();

    // 既に採点済みかチェック
    const existing = judgeScores.find(s => s.judgeId === score.judgeId && s.riderId === score.riderId);
    if (existing) {
        throw new Error('既に採点済みです');
    }

    const newScore: JudgeScore = {
        ...score,
        id: `score_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        submittedAt: new Date().toISOString(),
        locked: true,
    };

    judgeScores.push(newScore);
    await saveData('judge_scores.json', judgeScores);
    await addLog('judge_score', 'Judge score submitted', { score: newScore });
    return newScore;
}

// ==============================
// Audience Votes
// ==============================

export async function getAudienceVotes(): Promise<AudienceVote[]> {
    await initializeStore();
    return audienceVotes;
}

export async function getAudienceVotesForRider(riderId: string): Promise<AudienceVote[]> {
    await initializeStore();
    return audienceVotes.filter(v => v.riderId === riderId);
}

export async function hasDeviceVoted(deviceId: string, riderId: string): Promise<boolean> {
    await initializeStore();
    return audienceVotes.some(v => v.deviceId === deviceId && v.riderId === riderId);
}

export async function getDeviceVote(deviceId: string, riderId: string): Promise<AudienceVote | undefined> {
    await initializeStore();
    return audienceVotes.find(v => v.deviceId === deviceId && v.riderId === riderId);
}

export async function submitAudienceVote(vote: Omit<AudienceVote, 'id' | 'timestamp'>): Promise<AudienceVote> {
    await initializeStore();

    // 投票が開いているかチェック
    if (!contestSettings.votingEnabled) {
        throw new Error('現在、投票は受け付けていません');
    }

    // 現在の選手かチェック
    if (contestSettings.currentRiderId !== vote.riderId) {
        throw new Error('現在、この選手への投票は受け付けていません');
    }

    // 既に投票済みかチェック
    const existing = audienceVotes.find(v => v.deviceId === vote.deviceId && v.riderId === vote.riderId);
    if (existing) {
        // 変更可能期限内かチェック
        if (existing.canModifyUntil && new Date(existing.canModifyUntil) > new Date()) {
            // 投票を更新
            existing.score = vote.score;
            existing.timestamp = new Date().toISOString();
            await saveData('audience_votes.json', audienceVotes);
            await addLog('audience_vote', 'Audience vote modified', { vote: existing });
            return existing;
        }
        throw new Error('既に投票済みです');
    }

    const now = new Date();
    const modifyUntil = contestSettings.allowVoteModification
        ? new Date(now.getTime() + contestSettings.modificationWindowSeconds * 1000).toISOString()
        : undefined;

    const newVote: AudienceVote = {
        ...vote,
        id: `vote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: now.toISOString(),
        canModifyUntil: modifyUntil,
    };

    audienceVotes.push(newVote);
    await saveData('audience_votes.json', audienceVotes);
    await addLog('audience_vote', 'Audience vote submitted', { vote: newVote });
    return newVote;
}

// ==============================
// Contest Settings
// ==============================

export async function getSettings(): Promise<ContestSettings> {
    await initializeStore();
    return contestSettings;
}

export async function updateSettings(updates: Partial<ContestSettings>): Promise<ContestSettings> {
    await initializeStore();
    contestSettings = { ...contestSettings, ...updates };
    await saveData('settings.json', contestSettings);
    await addLog('setting_change', 'Settings updated', { updates });
    return contestSettings;
}

export async function setVotingEnabled(enabled: boolean, riderId?: string): Promise<ContestSettings> {
    await initializeStore();
    contestSettings.votingEnabled = enabled;
    if (riderId !== undefined) {
        contestSettings.currentRiderId = riderId;
    }
    await saveData('settings.json', contestSettings);
    await addLog('voting_control', enabled ? 'Voting started' : 'Voting stopped', { riderId });
    return contestSettings;
}

// ==============================
// Judges
// ==============================

export async function getJudges(): Promise<Judge[]> {
    await initializeStore();
    return judges;
}

export async function updateJudge(id: string, updates: Partial<Judge>): Promise<Judge | null> {
    await initializeStore();
    const index = judges.findIndex(j => j.id === id);
    if (index === -1) return null;

    judges[index] = { ...judges[index], ...updates, id };
    await saveData('judges.json', judges);
    return judges[index];
}

// ==============================
// Logs
// ==============================

export async function getLogs(): Promise<LogEntry[]> {
    await initializeStore();
    return logs.slice().reverse(); // 新しい順
}

async function addLog(
    type: LogEntry['type'],
    action: string,
    data: Record<string, unknown>
): Promise<void> {
    const entry: LogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        action,
        data,
        timestamp: new Date().toISOString(),
    };
    logs.push(entry);

    // ログが1000件を超えたら古いものを削除
    if (logs.length > 1000) {
        logs = logs.slice(-1000);
    }

    await saveData('logs.json', logs);
}

// ==============================
// CSV Export
// ==============================

export async function exportToCSV(): Promise<{
    riders: string;
    judgeScores: string;
    audienceVotes: string;
    results: string;
}> {
    await initializeStore();

    // Riders CSV
    const ridersCSV = [
        'ID,名前,ライダーネーム,写真URL,登録日時',
        ...riders.map(r => `${r.id},"${r.name}","${r.riderName}","${r.photo}",${r.createdAt}`)
    ].join('\n');

    // Judge Scores CSV
    const judgeScoresCSV = [
        'ID,ジャッジID,選手ID,合計点,送信日時,詳細スコア',
        ...judgeScores.map(s =>
            `${s.id},${s.judgeId},${s.riderId},${s.totalScore},${s.submittedAt},"${JSON.stringify(s.scores)}"`
        )
    ].join('\n');

    // Audience Votes CSV
    const audienceVotesCSV = [
        'ID,選手ID,スコア,端末ID,IP,UserAgent,投票日時',
        ...audienceVotes.map(v =>
            `${v.id},${v.riderId},${v.score},"${v.deviceId}","${v.ip}","${v.userAgent}",${v.timestamp}`
        )
    ].join('\n');

    // Results CSV
    const { calculateJudgeAverage, calculateAudienceScore, calculateTotalScore } = await import('./scoring');

    const resultsData = riders.map(rider => {
        const riderJudgeScores = judgeScores.filter(s => s.riderId === rider.id);
        const riderVotes = audienceVotes.filter(v => v.riderId === rider.id);

        const judgeAvg = calculateJudgeAverage(riderJudgeScores);
        const audienceScore = calculateAudienceScore(riderVotes, contestSettings.audienceWeight);
        const total = calculateTotalScore(judgeAvg, audienceScore);

        return {
            rider,
            judgeAvg,
            audienceScore,
            total,
            voteCount: riderVotes.length,
        };
    }).sort((a, b) => b.total - a.total);

    const resultsCSV = [
        '順位,選手ID,選手名,ライダーネーム,ジャッジ平均点,観客点,投票数,総合点',
        ...resultsData.map((r, i) =>
            `${i + 1},${r.rider.id},"${r.rider.name}","${r.rider.riderName}",${r.judgeAvg.toFixed(2)},${r.audienceScore.toFixed(2)},${r.voteCount},${r.total.toFixed(2)}`
        )
    ].join('\n');

    return {
        riders: ridersCSV,
        judgeScores: judgeScoresCSV,
        audienceVotes: audienceVotesCSV,
        results: resultsCSV,
    };
}
