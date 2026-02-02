import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // パス情報をヘッダーに注入（Layoutで使用するため）
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);

    // /admin 以下のパスをチェック
    if (pathname.startsWith('/admin')) {
        // ログインページ自体は除外
        if (pathname === '/admin/login') {
            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
        }

        const session = request.cookies.get('admin_session');

        // セッションがない場合はログインページへ
        if (!session || session.value !== 'authenticated') {
            const url = new URL('/admin/login', request.url);
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

// /admin 以下にのみ適用
export const config = {
    matcher: '/admin/:path*',
};
