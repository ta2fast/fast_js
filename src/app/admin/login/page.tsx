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
        <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-gradient-to-tr from-[#0f172a] via-[#1e293b] to-[#0f172a]">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)] rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--secondary)] rounded-full blur-[120px]"></div>
            </div>

            <div className="card w-full max-w-sm p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl bg-white/5 border border-white/10 relative z-10">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
                        <span className="text-4xl">🔐</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white mb-2">Admin Access</h1>
                    <p className="text-sm text-slate-400 font-medium">
                        Enter password to manage the contest
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="relative group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-4 text-center text-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                            autoFocus
                            required
                        />
                    </div>

                    {error && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <p className="text-center text-rose-400 text-xs font-bold bg-rose-500/10 py-3 rounded-xl border border-rose-500/20">
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] hover:opacity-90 text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--primary)]/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <a href="/" className="text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
                        ← Back to Top
                    </a>
                </div>
            </div>
        </div>
    );
}
