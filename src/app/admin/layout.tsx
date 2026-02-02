import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // クッキーを確認
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');

    // ミドルウェアで設定したパス情報を取得
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '';

    // セッションがない場合はログインページへ。ただしログインページ自身は除外
    if ((!session || session.value !== 'authenticated') && pathname !== '/admin/login') {
        redirect('/admin/login');
    }

    return <>{children}</>;
}
