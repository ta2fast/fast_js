// ==============================
// Voting Control API
// ==============================

import { NextRequest, NextResponse } from 'next/server';
import { setVotingEnabled, getSettings } from '@/lib/store';
import { ApiResponse, ContestSettings } from '@/types';

// POST /api/admin/voting - 投票開始/終了
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ContestSettings>>> {
    try {
        const body = await request.json();
        const { enabled, riderId } = body;

        if (typeof enabled !== 'boolean') {
            return NextResponse.json(
                { success: false, error: 'enabledは必須です' },
                { status: 400 }
            );
        }

        const settings = await setVotingEnabled(enabled, riderId);
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}

// GET /api/admin/voting - 投票状態を取得
export async function GET(): Promise<NextResponse<ApiResponse<{ votingEnabled: boolean; currentRiderId: string | null }>>> {
    try {
        const settings = await getSettings();
        return NextResponse.json({
            success: true,
            data: {
                votingEnabled: settings.votingEnabled,
                currentRiderId: settings.currentRiderId
            }
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
