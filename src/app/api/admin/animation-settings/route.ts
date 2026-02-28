import { NextRequest, NextResponse } from 'next/server';
import { getAnimationSettings, updateAnimationSettings } from '@/lib/store';
import { ApiResponse, AnimationSettings } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/admin/animation-settings - アニメーション設定を取得
export async function GET(): Promise<NextResponse<ApiResponse<AnimationSettings>>> {
    try {
        const settings = await getAnimationSettings();
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}

// POST /api/admin/animation-settings - アニメーション設定を更新
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AnimationSettings>>> {
    try {
        const updates = await request.json();
        const settings = await updateAnimationSettings(updates);
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
