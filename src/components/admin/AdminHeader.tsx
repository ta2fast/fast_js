'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminHeader() {
    const pathname = usePathname();

    const handleLogout = async () => {
        if (confirm('ログアウトしますか？')) {
            await fetch('/api/admin/auth', { method: 'DELETE' });
            window.location.href = '/admin/login';
        }
    };

    const navItems = [
        { label: 'ダッシュボード', href: '/admin' },
        { label: '選手管理', href: '/admin/riders' },
        { label: '大会設定', href: '/admin/settings' },
        { label: 'ログ', href: '/admin/logs' },
        { label: '使い方', href: '/admin/help' },
    ];

    return (
        <header className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">⚙️ 運営画面</h1>
                <button
                    onClick={handleLogout}
                    className="btn btn-ghost btn-sm text-rose-500 hover:bg-rose-500/10"
                >
                    ログアウト
                </button>
            </div>

            <nav className="nav justify-center flex-wrap">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>
        </header>
    );
}
