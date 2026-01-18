'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Rider, ContestSettings } from '@/types';
import { generateDeviceId, recordVote, hasVotedForRider, canModifyVote } from '@/lib/deviceId';

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
    const [countdown, setCountdown] = useState<number>(30);

    useEffect(() => {
        async function init() {
            const id = await generateDeviceId();
            setDeviceId(id);

            // 既に投票済みかチェック
            if (hasVotedForRider(riderId)) {
                setSubmitted(true);
            }
        }
        init();
        fetchData();
    }, [riderId]);

    useEffect(() => {
        // カウントダウンタイマー
        if (settings?.votingEnabled && countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [settings?.votingEnabled, countdown]);

    async function fetchData() {
        try {
            const [ridersRes, settingsRes] = await Promise.all([
                fetch('/api/riders'),
                fetch('/api/admin/settings'),
            ]);

            const ridersData = await ridersRes.json();
            const settingsData = await settingsRes.json();

            if (ridersData.success) {
                const found = ridersData.data.find((r: Rider) => r.id === riderId);
                setRider(found || null);
            }

            if (settingsData.success) {
                setSettings(settingsData.data);
                setCountdown(settingsData.data.votingDeadlineSeconds);

                // 現在の選手と一致するかチェック
                if (settingsData.data.currentRiderId !== riderId) {
                    setError('現在、この選手への投票は受け付けていません');
                }
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = useCallback(async () => {
        if (!selectedScore || submitting || !rider || !deviceId) return;

        console.log('Submitting vote:', { riderId: rider.id, score: selectedScore, deviceId, currentRiderId: settings?.currentRiderId });

        // 現在の選手かチェック
        if (settings?.currentRiderId !== rider.id) {
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

            if (data.success) {
                recordVote(rider.id, selectedScore);
                setSubmitted(true);
            } else {
                setError(data.error || '投票に失敗しました');
            }
        } catch (err) {
            console.error('Failed to submit vote:', err);
            setError('投票に失敗しました');
        } finally {
            setSubmitting(false);
        }
    }, [selectedScore, submitting, rider, deviceId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-[var(--text-muted)]">読み込み中...</div>
            </div>
        );
    }

    if (!rider) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <p className="text-xl mb-4">選手が見つかりません</p>
                <button onClick={() => router.push('/audience')} className="btn btn-primary">
                    戻る
                </button>
            </div>
        );
    }

    // 投票完了画面
    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fadeIn">
                <div className="card p-8 text-center max-w-md w-full">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-600 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">✓</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">投票完了！</h2>
                    <p className="text-[var(--text-muted)] mb-6">
                        <span className="text-[var(--foreground)] font-bold">{rider.name}</span>
                        <br />
                        に投票しました
                    </p>
                    <div className="flex justify-center gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span
                                key={star}
                                className={`text-3xl ${star <= selectedScore ? 'text-[var(--secondary)]' : 'text-[var(--surface-border)]'}`}
                            >
                                ★
                            </span>
                        ))}
                    </div>
                    <button
                        onClick={() => router.push('/audience')}
                        className="btn btn-primary w-full"
                    >
                        戻る
                    </button>
                </div>
            </div>
        );
    }

    // 投票停止中
    if (!settings?.votingEnabled) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="card p-8 text-center max-w-md w-full">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--danger)] to-red-600 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">⏸️</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">投票停止中</h2>
                    <p className="text-[var(--text-muted)] mb-6">
                        現在、投票は受け付けていません。<br />
                        投票開始をお待ちください。
                    </p>
                    <button
                        onClick={() => router.push('/audience')}
                        className="btn btn-ghost w-full"
                    >
                        戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col p-4">
            {/* Header */}
            <header className="mb-6">
                <button
                    onClick={() => router.push('/audience')}
                    className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors mb-4"
                >
                    ← 戻る
                </button>

                {/* Timer */}
                <div className="text-center mb-4">
                    <p className="text-sm text-[var(--text-muted)]">投票締切まで</p>
                    <p className={`timer ${countdown <= 10 ? 'warning' : ''}`}>
                        {countdown}秒
                    </p>
                </div>
            </header>

            {/* Rider Info */}
            <div className="card mb-6 animate-fadeIn">
                <div className="flex items-center gap-4">
                    <div className="rider-photo w-20 h-20 flex items-center justify-center text-3xl">
                        {rider.photo && rider.photo !== '/images/default-rider.png' ? (
                            <img
                                src={rider.photo}
                                alt={rider.name}
                                className="w-full h-full object-cover rounded-xl"
                            />
                        ) : (
                            '🏍️'
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{rider.name}</h2>
                        <span className="text-[var(--text-muted)]">{rider.riderName}</span>
                    </div>
                </div>
            </div>

            {/* Star Rating */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <p className="text-lg mb-6 text-[var(--text-muted)]">盛り上がり度を評価！</p>

                <div className="flex justify-center gap-2 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setSelectedScore(star)}
                            className={`star-btn ${star <= selectedScore ? 'active' : ''}`}
                        >
                            ★
                        </button>
                    ))}
                </div>

                {selectedScore > 0 && (
                    <p className="text-2xl font-bold mb-4 animate-fadeIn">
                        {selectedScore}点
                    </p>
                )}

                {error && (
                    <p className="text-[var(--danger)] text-center mb-4">{error}</p>
                )}
            </div>

            {/* Submit Button */}
            <div className="mt-auto">
                <button
                    onClick={handleSubmit}
                    disabled={!selectedScore || submitting || countdown === 0}
                    className="btn btn-secondary w-full text-lg py-4"
                >
                    {submitting ? '送信中...' : countdown === 0 ? '時間切れ' : '投票する'}
                </button>

                {settings.allowVoteModification && (
                    <p className="text-center text-sm text-[var(--text-muted)] mt-2">
                        ※ 投票後{settings.modificationWindowSeconds}秒以内なら変更可能
                    </p>
                )}
            </div>
        </div>
    );
}
