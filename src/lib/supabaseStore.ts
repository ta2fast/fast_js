// ==============================
// Supabase データストア
// ==============================

import { supabase } from './supabase';
import {
    Rider,
    JudgeScore,
    AudienceVote,
    ContestSettings,
    Judge,
    LogEntry,
    DEFAULT_CONTEST_SETTINGS,
    EvaluationItem,
    JudgeSession
} from '@/types';

// ==============================
// Helper Functions
// ==============================

function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// snake_case to camelCase converter for single object
function toCamelCase<T>(obj: Record<string, unknown>): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = value;
    }
    return result as T;
}

// camelCase to snake_case converter for single object
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = value;
    }
    return result;
}

// ==============================
// Riders
// ==============================

export async function getRiders(): Promise<Rider[]> {
    const { data, error } = await supabase
        .from('riders')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        riderName: row.rider_name || row.name,
        displayOrder: row.display_order || 0,
        createdAt: row.created_at,
    }));
}

export async function getRider(id: string): Promise<Rider | undefined> {
    const { data, error } = await supabase
        .from('riders')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return undefined; // Not found
        throw error;
    }
    return {
        id: data.id,
        name: data.name,
        riderName: data.rider_name || data.name,
        displayOrder: data.display_order || 0,
        createdAt: data.created_at,
    };
}

export async function createRider(rider: Omit<Rider, 'id' | 'createdAt'>): Promise<Rider> {
    // 現在の最大display_orderを取得
    const { data: existingRiders } = await supabase
        .from('riders')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

    const maxOrder = existingRiders && existingRiders.length > 0
        ? (existingRiders[0].display_order || 0)
        : 0;

    const newRider = {
        id: generateId('rider'),
        name: rider.name,
        rider_name: rider.riderName,
        display_order: rider.displayOrder ?? maxOrder + 1,
    };

    const { data, error } = await supabase
        .from('riders')
        .insert(newRider)
        .select()
        .single();

    if (error) throw error;
    await addLog('setting_change', 'Rider created', { rider: data });
    return {
        id: data.id,
        name: data.name,
        riderName: data.rider_name,
        displayOrder: data.display_order,
        createdAt: data.created_at,
    };
}

export async function updateRider(id: string, updates: Partial<Rider>): Promise<Rider | null> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.riderName !== undefined) updateData.rider_name = updates.riderName;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;

    const { data, error } = await supabase
        .from('riders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    await addLog('setting_change', 'Rider updated', { rider: data });
    return {
        id: data.id,
        name: data.name,
        riderName: data.rider_name,
        displayOrder: data.display_order,
        createdAt: data.created_at,
    };
}

export async function deleteRider(id: string): Promise<boolean> {
    const rider = await getRider(id);
    if (!rider) return false;

    const { error } = await supabase
        .from('riders')
        .delete()
        .eq('id', id);

    if (error) throw error;
    await addLog('setting_change', 'Rider deleted', { rider });
    return true;
}

// ==============================
// Judge Scores
// ==============================

export async function getJudgeScores(): Promise<JudgeScore[]> {
    const { data, error } = await supabase
        .from('judge_scores')
        .select('*')
        .order('submitted_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        judgeId: row.judge_id,
        riderId: row.rider_id,
        scores: row.scores,
        totalScore: parseFloat(row.total_score),
        submittedAt: row.submitted_at,
        locked: row.locked,
    }));
}

export async function getJudgeScoresForRider(riderId: string): Promise<JudgeScore[]> {
    const { data, error } = await supabase
        .from('judge_scores')
        .select('*')
        .eq('rider_id', riderId)
        .order('submitted_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        judgeId: row.judge_id,
        riderId: row.rider_id,
        scores: row.scores,
        totalScore: parseFloat(row.total_score),
        submittedAt: row.submitted_at,
        locked: row.locked,
    }));
}

export async function hasJudgeScored(judgeId: string, riderId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('judge_scores')
        .select('id')
        .eq('judge_id', judgeId)
        .eq('rider_id', riderId)
        .maybeSingle();

    if (error) throw error;
    return data !== null;
}

export async function submitJudgeScore(score: Omit<JudgeScore, 'id' | 'submittedAt' | 'locked'>): Promise<JudgeScore> {
    // Check if already scored
    const hasScored = await hasJudgeScored(score.judgeId, score.riderId);
    if (hasScored) {
        throw new Error('既に採点済みです');
    }

    const newScore = {
        id: generateId('score'),
        judge_id: score.judgeId,
        rider_id: score.riderId,
        scores: score.scores,
        total_score: score.totalScore,
        locked: true,
    };

    const { data, error } = await supabase
        .from('judge_scores')
        .insert(newScore)
        .select()
        .single();

    if (error) throw error;
    await addLog('judge_score', 'Judge score submitted', { score: data });
    return {
        id: data.id,
        judgeId: data.judge_id,
        riderId: data.rider_id,
        scores: data.scores,
        totalScore: parseFloat(data.total_score),
        submittedAt: data.submitted_at,
        locked: data.locked,
    };
}

// ==============================
// Audience Votes
// ==============================

export async function getAudienceVotes(): Promise<AudienceVote[]> {
    const { data, error } = await supabase
        .from('audience_votes')
        .select('*')
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        riderId: row.rider_id,
        score: row.score,
        deviceId: row.device_id,
        ip: row.ip,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        canModifyUntil: row.can_modify_until,
    }));
}

export async function getAudienceVotesForRider(riderId: string): Promise<AudienceVote[]> {
    const { data, error } = await supabase
        .from('audience_votes')
        .select('*')
        .eq('rider_id', riderId)
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        riderId: row.rider_id,
        score: row.score,
        deviceId: row.device_id,
        ip: row.ip,
        userAgent: row.user_agent,
        timestamp: row.timestamp,
        canModifyUntil: row.can_modify_until,
    }));
}

export async function hasDeviceVoted(deviceId: string, riderId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('audience_votes')
        .select('id')
        .eq('device_id', deviceId)
        .eq('rider_id', riderId)
        .maybeSingle();

    if (error) throw error;
    return data !== null;
}

export async function getDeviceVote(deviceId: string, riderId: string): Promise<AudienceVote | undefined> {
    const { data, error } = await supabase
        .from('audience_votes')
        .select('*')
        .eq('device_id', deviceId)
        .eq('rider_id', riderId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return undefined;
    return {
        id: data.id,
        riderId: data.rider_id,
        score: data.score,
        deviceId: data.device_id,
        ip: data.ip,
        userAgent: data.user_agent,
        timestamp: data.timestamp,
        canModifyUntil: data.can_modify_until,
    };
}

export async function submitAudienceVote(vote: Omit<AudienceVote, 'id' | 'timestamp'>): Promise<AudienceVote> {
    // Check if voting is enabled
    const settings = await getSettings();
    if (!settings.votingEnabled) {
        throw new Error('現在、投票は受け付けていません');
    }

    // Check if it's the current rider
    if (settings.currentRiderId !== vote.riderId) {
        throw new Error('現在、この選手への投票は受け付けていません');
    }

    // Check if already voted
    const existing = await getDeviceVote(vote.deviceId, vote.riderId);
    if (existing) {
        throw new Error('既に投票済みです');
    }

    const newVote = {
        id: generateId('vote'),
        rider_id: vote.riderId,
        score: vote.score,
        device_id: vote.deviceId,
        ip: vote.ip,
        user_agent: vote.userAgent,
        can_modify_until: null,
    };

    const { data, error } = await supabase
        .from('audience_votes')
        .insert(newVote)
        .select()
        .single();

    if (error) throw error;
    await addLog('audience_vote', 'Audience vote submitted', { vote: data });
    return {
        id: data.id,
        riderId: data.rider_id,
        score: data.score,
        deviceId: data.device_id,
        ip: data.ip,
        userAgent: data.user_agent,
        timestamp: data.timestamp,
        canModifyUntil: data.can_modify_until,
    };
}

// ==============================
// Contest Settings
// ==============================

export async function getSettings(): Promise<ContestSettings> {
    try {
        const { data, error } = await supabase
            .from('contest_settings')
            .select('*')
            .eq('id', 'default')
            .maybeSingle();

        if (error) {
            console.error('Failed to fetch settings from Supabase:', error);
            return { ...DEFAULT_CONTEST_SETTINGS };
        }
        if (!data) {
            // Create default settings if not exists
            await supabase
                .from('contest_settings')
                .insert({
                    id: 'default',
                    ...toSnakeCase(DEFAULT_CONTEST_SETTINGS as unknown as Record<string, unknown>)
                });
            return { ...DEFAULT_CONTEST_SETTINGS };
        }

        const rawRevealedIds = data.revealed_item_ids || [];

        // Extract animation config from revealed_item_ids array (stored as special object or JSON string)
        let animConfig: {
            labelDelay?: number;
            barDuration?: number;
            sortDelay?: number;
            sortDuration?: number;
            style?: 'Standard' | 'Pop-in' | 'Slide' | 'Flash';
            fontSize?: 'Small' | 'Medium' | 'Large' | 'Extra Large';
        } = {};
        const cleanRevealedIds: string[] = [];
        for (const entry of rawRevealedIds) {
            // Case 1: Already an object (Supabase JSONB auto-parses)
            if (typeof entry === 'object' && entry !== null && (entry as any).__animConfig) {
                const extracted = (entry as any).__animConfig;
                animConfig = {
                    labelDelay: parseInt(extracted.labelDelay) || 3000,
                    barDuration: parseInt(extracted.barDuration) || 3000,
                    sortDelay: parseInt(extracted.sortDelay) || 3000,
                    sortDuration: parseInt(extracted.sortDuration) || 800,
                    style: extracted.style || 'Standard',
                    fontSize: extracted.fontSize || 'Medium',
                };
            } else if (typeof entry === 'string') {
                // Case 2: JSON-stringified config object
                if (entry.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(entry);
                        if (parsed && parsed.__animConfig) {
                            const extracted = parsed.__animConfig;
                            animConfig = {
                                labelDelay: parseInt(extracted.labelDelay) || 3000,
                                barDuration: parseInt(extracted.barDuration) || 3000,
                                sortDelay: parseInt(extracted.sortDelay) || 3000,
                                sortDuration: parseInt(extracted.sortDuration) || 800,
                                style: extracted.style || 'Standard',
                                fontSize: extracted.fontSize || 'Medium',
                            };
                            continue; // Don't add to cleanRevealedIds
                        }
                    } catch { /* Not valid JSON, treat as normal ID */ }
                }
                cleanRevealedIds.push(entry);
            }
        }

        // Default config if missing or not fully parsed
        if (Object.keys(animConfig).length === 0) {
            animConfig = {
                labelDelay: 3000,
                barDuration: 3000,
                sortDelay: 3000,
                sortDuration: 800,
                style: 'Standard',
                fontSize: 'Medium',
            };
        }

        const baseSettings = {
            id: data.id,
            evaluationItems: data.evaluation_items as EvaluationItem[],
            audienceWeight: parseFloat(data.audience_weight),
            audienceMinScore: data.audience_min_score,
            audienceMaxScore: data.audience_max_score,
            votingEnabled: data.voting_enabled,
            votingDeadlineSeconds: data.voting_deadline_seconds,
            allowVoteModification: data.allow_vote_modification,
            modificationWindowSeconds: data.modification_window_seconds,
            currentRiderId: data.current_rider_id,
            contestName: data.contest_name,
            contestDate: data.contest_date,
            revealedItemIds: cleanRevealedIds,
            animationDelayLabelMs: animConfig.labelDelay ?? DEFAULT_CONTEST_SETTINGS.animationDelayLabelMs,
            animationBarDurationMs: animConfig.barDuration ?? DEFAULT_CONTEST_SETTINGS.animationBarDurationMs,
            animationSortDelayMs: animConfig.sortDelay ?? DEFAULT_CONTEST_SETTINGS.animationSortDelayMs,
            animationSortDurationMs: animConfig.sortDuration ?? DEFAULT_CONTEST_SETTINGS.animationSortDurationMs,
            animationStyle: animConfig.style ?? DEFAULT_CONTEST_SETTINGS.animationStyle,
            labelFontSize: animConfig.fontSize ?? DEFAULT_CONTEST_SETTINGS.labelFontSize,
            judgeCount: data.judge_count ?? 3,
        };

        return baseSettings;
    } catch (err) {
        console.error('Failed to fetch settings:', err);
        return { ...DEFAULT_CONTEST_SETTINGS };
    }
}

export async function updateSettings(updates: Partial<ContestSettings>): Promise<ContestSettings> {
    try {
        // 現在の設定を取得
        const currentSettings = await getSettings();

        // 更新内容をマージ
        const newSettings = { ...currentSettings, ...updates };

        // Prepare revealed_item_ids, ensuring the animation config object is updated
        let revealedWithConfig = newSettings.revealedItemIds.filter(id => {
            try {
                if (typeof id === 'object' && id !== null && (id as any).__animConfig) return false;
                if (typeof id === 'string' && id.startsWith('{"__animConfig"')) return false;
                return true;
            } catch { return true; }
        });

        const newAnimConfig = {
            __animConfig: {
                labelDelay: newSettings.animationDelayLabelMs,
                barDuration: newSettings.animationBarDurationMs,
                sortDelay: newSettings.animationSortDelayMs,
                sortDuration: newSettings.animationSortDurationMs,
                style: newSettings.animationStyle,
                fontSize: newSettings.labelFontSize,
            }
        };
        revealedWithConfig.push(JSON.stringify(newAnimConfig));

        const upsertData: Record<string, unknown> = {
            id: 'default',
            evaluation_items: newSettings.evaluationItems,
            audience_weight: newSettings.audienceWeight,
            audience_min_score: newSettings.audienceMinScore,
            audience_max_score: newSettings.audienceMaxScore,
            voting_enabled: newSettings.votingEnabled,
            voting_deadline_seconds: newSettings.votingDeadlineSeconds,
            allow_vote_modification: newSettings.allowVoteModification,
            modification_window_seconds: newSettings.modificationWindowSeconds,
            current_rider_id: newSettings.currentRiderId,
            contest_name: newSettings.contestName,
            contest_date: newSettings.contestDate,
            revealed_item_ids: revealedWithConfig,
            judge_count: newSettings.judgeCount,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('contest_settings')
            .upsert(upsertData, { onConflict: 'id' });

        if (error) {
            console.error('Failed to update settings in Supabase:', error);
            throw error;
        }

        await addLog('setting_change', 'Settings updated', { updates });
        return getSettings();
    } catch (err) {
        console.error('updateSettings error:', err);
        throw err;
    }
}

export async function setVotingEnabled(enabled: boolean, riderId?: string): Promise<ContestSettings> {
    const updates: Partial<ContestSettings> = {
        votingEnabled: enabled
    };
    if (riderId !== undefined) {
        updates.currentRiderId = riderId;
    }

    await addLog('voting_control', enabled ? 'Voting started' : 'Voting stopped', { riderId });
    return updateSettings(updates);
}

// ==============================
// Judges
// ==============================

export async function getJudges(): Promise<Judge[]> {
    const { data, error } = await supabase
        .from('judges')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        isActive: row.is_active,
    }));
}

export async function createJudge(judge: Omit<Judge, 'id'>): Promise<Judge> {
    const newJudge = {
        id: generateId('judge'),
        name: judge.name,
        is_active: judge.isActive ?? true,
    };

    const { data, error } = await supabase
        .from('judges')
        .insert(newJudge)
        .select()
        .single();

    if (error) throw error;
    await addLog('setting_change', 'Judge created', { judge: data });
    return {
        id: data.id,
        name: data.name,
        isActive: data.is_active,
    };
}

export async function updateJudge(id: string, updates: Partial<Judge>): Promise<Judge | null> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
        .from('judges')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    await addLog('setting_change', 'Judge updated', { judge: data });
    return {
        id: data.id,
        name: data.name,
        isActive: data.is_active,
    };
}

export async function deleteJudge(id: string): Promise<boolean> {
    const { data: judge } = await supabase
        .from('judges')
        .select('*')
        .eq('id', id)
        .single();

    if (!judge) return false;

    const { error } = await supabase
        .from('judges')
        .delete()
        .eq('id', id);

    if (error) throw error;
    await addLog('setting_change', 'Judge deleted', { judge });
    return true;
}

// ==============================
// Judge Sessions
// ==============================

export async function getJudgeSessions(): Promise<JudgeSession[]> {
    const { data, error } = await supabase
        .from('judge_sessions')
        .select('*');

    if (error) throw error;
    return (data || []).map(row => ({
        judgeId: row.judge_id,
        isOccupied: row.is_occupied,
        updatedAt: row.updated_at,
    }));
}

export async function occupyJudgeSeat(judgeId: string): Promise<boolean> {
    const { error } = await supabase
        .from('judge_sessions')
        .update({ is_occupied: true, updated_at: new Date().toISOString() })
        .eq('judge_id', judgeId);

    if (error) {
        console.error('Failed to occupy seat:', error);
        return false;
    }
    return true;
}

export async function releaseJudgeSeat(judgeId: string): Promise<boolean> {
    const { error } = await supabase
        .from('judge_sessions')
        .update({ is_occupied: false, updated_at: new Date().toISOString() })
        .eq('judge_id', judgeId);

    if (error) {
        console.error('Failed to release seat:', error);
        return false;
    }
    return true;
}

export async function resetAllJudgeSessions(): Promise<boolean> {
    // PostgREST supports unfiltered updates only if specifically configured.
    // To be safe, we add a filter that matches all rows.
    const { error } = await supabase
        .from('judge_sessions')
        .update({ is_occupied: false, updated_at: new Date().toISOString() })
        .neq('judge_id', '');

    if (error) {
        console.error('Failed to reset all judge sessions:', error);
        throw error; // Throw so the UI can catch it
    }
    await addLog('setting_change', 'All judge sessions reset', {});
    return true;
}

// ==============================
// Logs
// ==============================

export async function getLogs(): Promise<LogEntry[]> {
    const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        type: row.type as LogEntry['type'],
        action: row.action,
        data: row.data,
        timestamp: row.timestamp,
        userId: row.user_id,
    }));
}

async function addLog(
    type: LogEntry['type'],
    action: string,
    data: Record<string, unknown>
): Promise<void> {
    const entry = {
        id: generateId('log'),
        type,
        action,
        data,
    };

    const { error } = await supabase
        .from('logs')
        .insert(entry);

    if (error) {
        console.error('Failed to add log:', error);
    }
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
    const allRiders = await getRiders();
    const allJudgeScores = await getJudgeScores();
    const allAudienceVotes = await getAudienceVotes();
    const settings = await getSettings();

    // Riders CSV
    const ridersCSV = [
        'ID,名前,ライダーネーム,登録日時',
        ...allRiders.map(r => `${r.id},"${r.name}","${r.riderName}",${r.createdAt}`)
    ].join('\n');

    // Judge Scores CSV
    const judgeScoresCSV = [
        'ID,ジャッジID,選手ID,合計点,送信日時,詳細スコア',
        ...allJudgeScores.map(s =>
            `${s.id},${s.judgeId},${s.riderId},${s.totalScore},${s.submittedAt},"${JSON.stringify(s.scores)}"`
        )
    ].join('\n');

    // Audience Votes CSV
    const audienceVotesCSV = [
        'ID,選手ID,スコア,端末ID,IP,UserAgent,投票日時',
        ...allAudienceVotes.map(v =>
            `${v.id},${v.riderId},${v.score},"${v.deviceId}","${v.ip}","${v.userAgent}",${v.timestamp}`
        )
    ].join('\n');

    // Results CSV
    const { calculateJudgeAverage, calculateAudienceScore, calculateTotalScore } = await import('./scoring');

    const resultsData = allRiders.map(rider => {
        const riderJudgeScores = allJudgeScores.filter(s => s.riderId === rider.id);
        const riderVotes = allAudienceVotes.filter(v => v.riderId === rider.id);

        const judgeAvg = calculateJudgeAverage(riderJudgeScores);
        const audienceScore = calculateAudienceScore(riderVotes, settings.audienceWeight);
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

// ==============================
// Initialize (no-op for Supabase)
// ==============================
export async function initializeStore(): Promise<void> {
    // No initialization needed for Supabase
    // Database is already initialized via SQL schema
}

// ==============================
// Reset Data
// ==============================
export async function resetContestData(): Promise<void> {
    try {
        // 1. Delete scores, votes, and logs
        const results = await Promise.all([
            supabase.from('judge_scores').delete().neq('id', ''),
            supabase.from('audience_votes').delete().neq('id', ''),
            supabase.from('logs').delete().neq('id', ''),
        ]);

        const errors = results.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) {
            console.error('Failed to reset some tables:', errors);
            throw new Error('データの削除に失敗しました');
        }

        // 2. Reset settings (current rider and voting status)
        await updateSettings({
            currentRiderId: null,
            votingEnabled: false,
        });

        await addLog('setting_change', 'All statistics and logs reset', {});
    } catch (err) {
        console.error('resetContestData error:', err);
        throw err;
    }
}
