// ==============================
// Judge Score API
// ==============================

import { NextRequest, NextResponse } from 'next/server';
import {
    getJudgeScores,
    getJudgeScoresForRider,
    submitJudgeScore,
    hasJudgeScored,
    getSettings
} from '@/lib/store';
import { calculateJudgeScore } from '@/lib/scoring';
import { ApiResponse, JudgeScore } from '@/types';

// GET /api/judge/score - ジャッジスコアを取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<JudgeScore[]>>> {
    try {
        const { searchParams } = new URL(request.url);
        const riderId = searchParams.get('riderId');

        const scores = riderId
            ? await getJudgeScoresForRider(riderId)
            : await getJudgeScores();

        return NextResponse.json({ success: true, data: scores });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}

// POST /api/judge/score - ジャッジスコアを送信
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<JudgeScore>>> {
    try {
        const body = await request.json();
        const { judgeId, riderId, scores } = body;

        if (!judgeId || !riderId || !scores || !Array.isArray(scores)) {
            return NextResponse.json(
                { success: false, error: 'ジャッジID、選手ID、スコアは必須です' },
                { status: 400 }
            );
        }

        // 既に採点済みかチェック
        const alreadyScored = await hasJudgeScored(judgeId, riderId);
        if (alreadyScored) {
            return NextResponse.json(
                { success: false, error: '既に採点済みです' },
                { status: 400 }
            );
        }

        // 設定を取得して合計点を計算
        const settings = await getSettings();
        const totalScore = calculateJudgeScore(scores, settings.evaluationItems);

        const judgeScore = await submitJudgeScore({
            judgeId,
            riderId,
            scores,
            totalScore,
        });

        return NextResponse.json({ success: true, data: judgeScore });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
