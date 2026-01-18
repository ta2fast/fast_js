// ==============================
// Judge Status API
// ==============================

import { NextRequest, NextResponse } from 'next/server';
import { hasJudgeScored, getJudges } from '@/lib/store';
import { ApiResponse } from '@/types';

interface JudgeStatus {
    judgeId: string;
    riderId: string;
    hasScored: boolean;
}

// GET /api/judge/status - ジャッジの採点状況を確認
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<JudgeStatus | { judges: { id: string; name: string; isActive: boolean }[] }>>> {
    try {
        const { searchParams } = new URL(request.url);
        const judgeId = searchParams.get('judgeId');
        const riderId = searchParams.get('riderId');

        // ジャッジ一覧を取得
        if (!judgeId && !riderId) {
            const judges = await getJudges();
            return NextResponse.json({ success: true, data: { judges } });
        }

        if (!judgeId || !riderId) {
            return NextResponse.json(
                { success: false, error: 'judgeIdとriderIdは必須です' },
                { status: 400 }
            );
        }

        const hasScored = await hasJudgeScored(judgeId, riderId);

        return NextResponse.json({
            success: true,
            data: { judgeId, riderId, hasScored }
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
