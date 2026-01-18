// ==============================
// Logs API
// ==============================

import { NextResponse } from 'next/server';
import { getLogs } from '@/lib/store';
import { ApiResponse, LogEntry } from '@/types';

// GET /api/admin/logs - ログを取得
export async function GET(): Promise<NextResponse<ApiResponse<LogEntry[]>>> {
    try {
        const logs = await getLogs();
        return NextResponse.json({ success: true, data: logs });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
