import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // クッキーを確認
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');

    // セッションがない場合はログインへ。ただし既にログインページにいる場合は何もしない（Next.jsが自動処理するが念のため）
    // NOTE: redirect() will throw an error that Next.js catches to perform the redirect. 
    // It's safe to call inside the component if we want server-side protection.

    // Check if the current path is /admin/login is done by file structure, 
    // but layout applies to all sub-routes. If this layout is src/app/admin/layout.tsx, 
    // it wraps src/app/admin/login/page.tsx too.
    // We should allow /admin/login.

    // In Next.js, we can't easily get the current path in a server component (metadata is for tags).
    // However, we can use Middleware for more robust redirects, 
    // or just check inside the layout and ignore if it's the login route.

    // Actually, if we put the login page OUTSIDE this layout's scope or handle it here.
    // Let's check headers for the URL if available or use Middleware.
    // But Middleware is more complex to set up correctly with file systems.

    // Let's use a simpler approach: check for session in the layout. 
    // To avoid redirect loops for the login page, we can either:
    // 1. Move login page to /admin-login (outside /admin)
    // 2. Or check if there's a way to know we are on the login page.

    // Let's go with option 1 (renaming it slightly or moving it) if it becomes an issue, 
    // but usually layouts in Next.js wrap everything.

    // Wait, let's look at the file structure again.
    // src/app/admin/page.tsx
    // src/app/admin/login/page.tsx
    // src/app/admin/layout.tsx

    // If I use middleware, it's cleaner. But I already planned Layout check.
    // Let's try to detect path or just accept that /admin/login is also wrapped.

    // If authenticated, we show children.
    // If not authenticated, we redirect to /admin/login BUT ONLY IF we are NOT already on /admin/login.

    // Actually, I'll move the login page to /admin-login to keep the /admin layout clean.
    // No, user specifically asked for "admin password lock". 
    // I'll use a Middleware instead, it's the modern Next.js way for auth.

    return <>{children}</>;
}
