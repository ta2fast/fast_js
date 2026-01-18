// ==============================
// Admin Settings API
// ==============================

import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/store';
import { ApiResponse, ContestSettings } from '@/types';

// GET /api/admin/settings - 設定を取得
export async function GET(): Promise<NextResponse<ApiResponse<ContestSettings>>> {
    try {
        const settings = await getSettings();
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}

// POST /api/admin/settings - 設定を更新
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ContestSettings>>> {
    try {
        const updates = await request.json();
        const settings = await updateSettings(updates);
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
