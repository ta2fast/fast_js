// ==============================
// Riders API
// ==============================

import { NextRequest, NextResponse } from 'next/server';
import { getRiders, createRider, updateRider, deleteRider } from '@/lib/store';
import { ApiResponse, Rider } from '@/types';

// GET /api/riders - 全選手を取得
export async function GET(): Promise<NextResponse<ApiResponse<Rider[]>>> {
    try {
        const riders = await getRiders();
        return NextResponse.json({ success: true, data: riders });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}

// POST /api/riders - 選手を追加
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Rider>>> {
    try {
        const body = await request.json();
        const { name, number, photo } = body;

        if (!name || number === undefined) {
            return NextResponse.json(
                { success: false, error: '名前と背番号は必須です' },
                { status: 400 }
            );
        }

        const rider = await createRider({
            name,
            riderName: name,
            number,
            photo: photo || '/images/default-rider.png',
        });

        return NextResponse.json({ success: true, data: rider });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}

// PUT /api/riders - 選手を更新
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<Rider>>> {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'IDは必須です' },
                { status: 400 }
            );
        }

        const rider = await updateRider(id, updates);
        if (!rider) {
            return NextResponse.json(
                { success: false, error: '選手が見つかりません' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: rider });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}

// DELETE /api/riders - 選手を削除
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<boolean>>> {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'IDは必須です' },
                { status: 400 }
            );
        }

        const deleted = await deleteRider(id);
        if (!deleted) {
            return NextResponse.json(
                { success: false, error: '選手が見つかりません' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: true });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
