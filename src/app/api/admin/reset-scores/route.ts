// ==============================
// Admin Reset Scores API
// ==============================

import { NextResponse } from 'next/server';
import { resetScoresAndVotes } from '@/lib/store';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

// POST /api/admin/reset-scores - 採点データのみを初期化
export async function POST(): Promise<NextResponse<ApiResponse<boolean>>> {
    try {
        await resetScoresAndVotes();
        return NextResponse.json({ success: true, data: true });
    } catch (error) {
        console.error('API reset-scores error:', error);
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
