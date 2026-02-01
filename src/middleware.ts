import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // /admin 以下のパスをチェック
    if (pathname.startsWith('/admin')) {
        // ログインページ自体は除外
        if (pathname === '/admin/login') {
            return NextResponse.next();
        }

        const session = request.cookies.get('admin_session');

        // セッションがない場合はログインページへ
        if (!session || session.value !== 'authenticated') {
            const url = new URL('/admin/login', request.url);
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

// /admin 以下にのみ適用
export const config = {
    matcher: '/admin/:path*',
};
