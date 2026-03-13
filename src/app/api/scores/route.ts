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
            const riderAllJudgeScores = judgeScores.filter(s => s.riderId === rider.id);
            const riderVotes = audienceVotes.filter(v => v.riderId === rider.id);

            // Group judge scores by try number
            const try1JudgeScores = riderAllJudgeScores.filter(s => s.tryNumber === 1);
            const try2JudgeScores = riderAllJudgeScores.filter(s => s.tryNumber === 2);

            const calculateTryScore = (jScores: typeof riderAllJudgeScores) => {
                const judgeAvg = calculateJudgeAverage(jScores);
                const audienceWeighted = calculateAudienceScore(riderVotes, settings.audienceWeight);
                return calculateTotalScore(judgeAvg, audienceWeighted);
            };

            const try1Total = calculateTryScore(try1JudgeScores);
            const try2Total = calculateTryScore(try2JudgeScores);

            // Best score logic
            const bestTotalScore = Math.max(try1Total, try2Total);

            const audienceAverage = calculateAudienceAverage(riderVotes);
            const audienceWeightedScore = calculateAudienceScore(riderVotes, settings.audienceWeight);

            return {
                riderId: rider.id,
                rider,
                judgeScores: riderAllJudgeScores, // Keep all for details
                try1Total,
                try2Total,
                judgeAverage: calculateJudgeAverage(riderAllJudgeScores.filter(s => s.totalScore === Math.max(...riderAllJudgeScores.map(sc => sc.totalScore)))), // Contextually we might want avg of best try
                audienceVotes: riderVotes,
                audienceAverage,
                audienceWeightedScore,
                totalScore: bestTotalScore,
                rank: 0,
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
