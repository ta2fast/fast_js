'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Rider, ContestSettings } from '@/types';
import { generateDeviceId, recordVote, hasVotedForRider } from '@/lib/deviceId';

export default function VotePage() {
    const router = useRouter();
    const params = useParams();
    const riderId = params.riderId as string;

    const [rider, setRider] = useState<Rider | null>(null);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [selectedScore, setSelectedScore] = useState<number>(0);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string>('');

    const isMounted = useRef(true);
    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [ridersRes, settingsRes] = await Promise.all([
                fetch('/api/riders', { cache: 'no-store' }),
                fetch('/api/admin/settings', { cache: 'no-store' }),
            ]);

            const ridersData = await ridersRes.json();
            const settingsData = await settingsRes.json();

            if (!isMounted.current) return;

            if (settingsData.success) {
                const s = settingsData.data;
                setSettings(s);

                // 【重要】別の選手に切り替わった場合、または投票が無効になった場合はトップへ戻る
                if (s.currentRiderId !== riderId || !s.votingEnabled) {
                    console.log('--- VOTE PAGE REDIRECT TRIGGERED --- Context changed');
                    router.replace('/audience');
                    return;
                }
                
                // Check if already voted for this try
                if (hasVotedForRider(riderId, s.currentTry)) {
                    setSubmitted(true);
                }
            }

            if (ridersData.success) {
                const found = ridersData.data.find((r: Rider) => r.id === riderId);
                if (found) {
                    setRider(found);
                } else if (isMounted.current) {
                    setError('選手が見つかりません');
                }
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [riderId, router]);

    useEffect(() => {
        async function init() {
            const id = await generateDeviceId();
            if (isMounted.current) {
                setDeviceId(id);
            }
            fetchData();
        }
        init();

        const poll = setInterval(fetchData, 3000);
        return () => clearInterval(poll);
    }, [riderId, fetchData]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();

        if (!selectedScore || submitting || !rider || !deviceId) return;

        // セキュリティチェック
        if (settings?.currentRiderId !== rider.id || !settings?.votingEnabled) {
            setError('現在、この選手への投票は受け付けていません');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/audience/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    riderId: rider.id,
                    score: selectedScore,
                    deviceId,
                }),
            });

            const data = await res.json();

            if (!isMounted.current) return;

            if (data.success) {
                recordVote(rider.id, settings?.currentTry || 1, selectedScore);
                setSubmitted(true);
            } else {
                setError(data.error || '投票に失敗しました');
            }
        } catch (err) {
            console.error('Submit error:', err);
            if (isMounted.current) setError('通信エラーが発生しました');
        } finally {
            if (isMounted.current) setSubmitting(false);
        }
    }, [selectedScore, submitting, rider, deviceId, settings]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-xl text-[var(--text-muted)] animate-pulse">読み込み中...</div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col p-6 items-center justify-center bg-[var(--background)] text-center">
                <div className="card p-10 max-w-md w-full animate-fadeIn shadow-2xl border-t-4 border-[var(--accent)] bg-[var(--surface)]">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-600 flex items-center justify-center mx-auto mb-8 shadow-lg border-2 border-emerald-400/20">
                        <span className="text-6xl text-white font-bold">✓</span>
                    </div>
                    <h2 className="text-3xl font-black mb-4 text-white">投票完了！</h2>
                    <p className="text-[var(--text-muted)] mb-8">
                        <span className="text-[var(--foreground)] font-bold text-lg">{rider?.riderName}</span>
                        <br />に投票しました
                    </p>
                    <div className="flex justify-center gap-2 mb-10 bg-[var(--surface-light)] py-4 rounded-xl shadow-inner">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-4xl ${star <= selectedScore ? 'text-[var(--secondary)]' : 'text-gray-700'}`}>★</span>
                        ))}
                    </div>
                    <Link href="/audience" className="btn btn-primary w-full py-4 text-lg"> 一覧へ戻る </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col p-6 items-center justify-start bg-[var(--background)]">
            <header className="mb-6 flex justify-between items-start w-full max-w-md">
                <Link href="/audience" className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors p-2 no-underline"> ← 戻る </Link>
                <button type="button" onClick={() => window.location.reload()} className="p-2 rounded-full bg-[var(--surface-light)] hover:bg-[var(--surface-border)] transition-colors shadow-sm"> <span className="text-xl">🔄</span> </button>
            </header>

            <main className="w-full max-w-md flex flex-col animate-fadeIn">
                <div className="card mb-8 p-8 text-center shadow-2xl border-t-4 border-[var(--primary)] bg-[var(--surface)]">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-lg"> <span className="text-4xl">🏍️</span> </div>
                    <h2 className="text-2xl font-black text-white">{rider?.riderName}</h2>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">{rider?.name}</p>
                </div>

                <div className="card flex-1 flex flex-col items-center justify-center p-8 mb-8 bg-[var(--surface)] shadow-xl">
                    <p className="text-lg mb-8 text-[var(--foreground)] font-bold">盛り上がり度を評価！</p>
                    <div className="flex justify-center gap-2 mb-10 bg-[var(--surface-light)] p-5 rounded-3xl border border-[var(--surface-border)] shadow-inner w-full">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setSelectedScore(star)}
                                className={`star-btn text-5xl transition-all hover:scale-125 ${star <= selectedScore ? 'active !text-[var(--secondary)]' : 'text-gray-600'}`}
                            > ★ </button>
                        ))}
                    </div>
                    {selectedScore > 0 && <p className="text-4xl font-black text-[var(--secondary)] animate-bounce">{selectedScore} <span className="text-lg">点</span></p>}
                    {error && <p className="text-[var(--danger)] text-sm font-bold mt-4">{error}</p>}
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={selectedScore === 0 || submitting}
                    className="btn btn-secondary w-full text-2xl py-6 rounded-2xl shadow-2xl transition-all active:scale-95"
                >
                    {submitting ? '送信中...' : '投票を確定する'}
                </button>
            </main>
        </div>
    );
}
