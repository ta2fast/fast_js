// ==============================
// Scores API (Results)
// ==============================

import { NextResponse } from 'next/server';
import {
    getRiders,
    getJudgeScores,
    getAudienceVotes,
    getSettings
} from '@/lib/store';
import {
    calculateJudgeAverage,
    calculateAudienceScore,
    calculateAudienceAverage,
    calculateTotalScore,
    calculateRankings
} from '@/lib/scoring';
import { ApiResponse, RiderResult } from '@/types';

// GET /api/scores - 全選手のスコア・順位を取得
export async function GET(): Promise<NextResponse<ApiResponse<RiderResult[]>>> {
    try {
        const [riders, judgeScores, audienceVotes, settings] = await Promise.all([
            getRiders(),
            getJudgeScores(),
            getAudienceVotes(),
            getSettings(),
        ]);

        const results = riders.map(rider => {
            const riderJudgeScores = judgeScores.filter(s => s.riderId === rider.id);
            const riderVotes = audienceVotes.filter(v => v.riderId === rider.id);

            const judgeAverage = calculateJudgeAverage(riderJudgeScores);
            const audienceAverage = calculateAudienceAverage(riderVotes);
            const audienceWeightedScore = calculateAudienceScore(riderVotes, settings.audienceWeight);
            const totalScore = calculateTotalScore(judgeAverage, audienceWeightedScore);

            return {
                riderId: rider.id,
                rider,
                judgeScores: riderJudgeScores,
                judgeAverage,
                audienceVotes: riderVotes,
                audienceAverage,
                audienceWeightedScore,
                totalScore,
                rank: 0, // 後で計算
                isFinalized: false,
            };
        });

        const rankedResults = calculateRankings(results);

        return NextResponse.json({ success: true, data: rankedResults });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
