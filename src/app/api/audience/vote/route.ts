// ==============================
// Audience Vote API
// ==============================

import { NextRequest, NextResponse } from 'next/server';
import {
    getAudienceVotes,
    getAudienceVotesForRider,
    submitAudienceVote,
    hasDeviceVoted,
    getDeviceVote,
    getSettings
} from '@/lib/store';
import { ApiResponse, AudienceVote } from '@/types';

// GET /api/audience/vote - 投票を取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AudienceVote[] | { hasVoted: boolean; vote?: AudienceVote }>>> {
    try {
        const { searchParams } = new URL(request.url);
        const riderId = searchParams.get('riderId');
        const deviceId = searchParams.get('deviceId');

        // 特定の端末が投票済みか確認
        if (deviceId && riderId) {
            const hasVoted = await hasDeviceVoted(deviceId, riderId);
            const vote = hasVoted ? await getDeviceVote(deviceId, riderId) : undefined;
            return NextResponse.json({
                success: true,
                data: { hasVoted, vote }
            });
        }

        const votes = riderId
            ? await getAudienceVotesForRider(riderId)
            : await getAudienceVotes();

        return NextResponse.json({ success: true, data: votes });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}

// POST /api/audience/vote - 投票を送信
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AudienceVote>>> {
    try {
        const body = await request.json();
        const { riderId, score, deviceId } = body;

        if (!riderId || score === undefined || !deviceId) {
            return NextResponse.json(
                { success: false, error: '選手ID、スコア、端末IDは必須です' },
                { status: 400 }
            );
        }

        // 設定を確認
        const settings = await getSettings();
        if (!settings.votingEnabled) {
            return NextResponse.json(
                { success: false, error: '現在、投票は受け付けていません' },
                { status: 400 }
            );
        }

        // スコア範囲をチェック
        if (score < settings.audienceMinScore || score > settings.audienceMaxScore) {
            return NextResponse.json(
                { success: false, error: `スコアは${settings.audienceMinScore}〜${settings.audienceMaxScore}の範囲で入力してください` },
                { status: 400 }
            );
        }

        // IPアドレスとUserAgentを取得
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        const vote = await submitAudienceVote({
            riderId,
            score,
            deviceId,
            ip: typeof ip === 'string' ? ip : ip.split(',')[0],
            userAgent,
        });

        return NextResponse.json({ success: true, data: vote });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 400 }
        );
    }
}
