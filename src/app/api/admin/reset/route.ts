// ==============================
// Admin Reset API
// ==============================

import { NextResponse } from 'next/server';
import { resetContestData } from '@/lib/store';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

// POST /api/admin/reset - データを初期化
export async function POST(): Promise<NextResponse<ApiResponse<boolean>>> {
    try {
        await resetContestData();
        return NextResponse.json({ success: true, data: true });
    } catch (error) {
        console.error('API reset error:', error);
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
