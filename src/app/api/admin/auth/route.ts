// ==============================
// Admin Authentication API
// ==============================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const COOKIE_NAME = 'admin_session';

export const dynamic = 'force-dynamic';

// GET /api/admin/auth - セッション確認
export async function GET() {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);

    if (session && session.value === 'authenticated') {
        return NextResponse.json({ success: true, authenticated: true });
    }

    return NextResponse.json({ success: true, authenticated: false });
}

// POST /api/admin/auth - ログイン
export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        if (password === ADMIN_PASSWORD) {
            const response = NextResponse.json({ success: true });

            // セッションクッキーを設定
            (await cookies()).set(COOKIE_NAME, 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 60 * 60 * 24, // 1日
            });

            return response;
        }

        return NextResponse.json(
            { success: false, error: 'パスワードが正しくありません' },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'エラーが発生しました' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/auth - ログアウト
export async function DELETE() {
    (await cookies()).delete(COOKIE_NAME);
    return NextResponse.json({ success: true });
}
