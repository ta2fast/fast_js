'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/admin');
            } else {
                setError(data.error || 'ログインに失敗しました');
            }
        } catch (err) {
            setError('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-light)]">
            <div className="card w-full max-w-md p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <span className="text-4xl mb-4 block">🔒</span>
                    <h1 className="text-2xl font-bold">運営者ログイン</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-2">
                        管理画面にアクセスするにはパスワードを入力してください
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="パスワード"
                            className="input text-center text-lg"
                            autoFocus
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-center text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full py-4 text-lg shadow-lg active:scale-95"
                    >
                        {loading ? '認証中...' : 'ログイン'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
                        ← トップページに戻る
                    </a>
                </div>
            </div>
        </div>
    );
}
