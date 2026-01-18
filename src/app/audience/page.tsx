'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rider, ContestSettings } from '@/types';
import { hasVotedForRider, getVoteRecord } from '@/lib/deviceId';

export default function AudiencePage() {
    const [currentRider, setCurrentRider] = useState<Rider | null>(null);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [votedScore, setVotedScore] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchData();
        // 3秒ごとに更新（運営が選手を切り替えた時に反映）
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    async function fetchData() {
        try {
            const settingsRes = await fetch('/api/admin/settings');
            const settingsData = await settingsRes.json();

            if (settingsData.success) {
                setSettings(settingsData.data);

                // 現在の選手を取得
                if (settingsData.data.currentRiderId) {
                    const ridersRes = await fetch('/api/riders');
                    const ridersData = await ridersRes.json();

                    if (ridersData.success) {
                        const rider = ridersData.data.find(
                            (r: Rider) => r.id === settingsData.data.currentRiderId
                        );
                        setCurrentRider(rider || null);

                        // 投票済みか確認
                        if (rider) {
                            const record = getVoteRecord(rider.id);
                            if (record) {
                                setHasVoted(true);
                                setVotedScore(record.score);
                            } else {
                                setHasVoted(false);
                                setVotedScore(null);
                            }
                        }
                    }
                } else {
                    setCurrentRider(null);
                    setHasVoted(false);
                    setVotedScore(null);
                }
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleVote() {
        if (!currentRider) return;
        router.push(`/audience/vote/${currentRider.id}`);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-[var(--text-muted)]">読み込み中...</div>
            </div>
        );
    }

    // 投票が開いていない場合
    if (!settings?.votingEnabled) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="card p-8 text-center max-w-md w-full animate-fadeIn">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--surface)] to-[var(--surface-light)] flex items-center justify-center mx-auto mb-6">
                        <span className="text-5xl">⏳</span>
                    </div>
                    <h1 className="text-2xl font-bold mb-4">投票待機中</h1>
                    <p className="text-[var(--text-muted)]">
                        投票が始まるまでお待ちください
                    </p>
                    <div className="mt-6">
                        <span className="badge badge-secondary">投票停止中</span>
                    </div>
                </div>
            </div>
        );
    }

    // 現在の選手が設定されていない場合
    if (!currentRider) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="card p-8 text-center max-w-md w-full animate-fadeIn">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center mx-auto mb-6">
                        <span className="text-5xl">🎤</span>
                    </div>
                    <h1 className="text-2xl font-bold mb-4">次の選手をお待ちください</h1>
                    <p className="text-[var(--text-muted)]">
                        運営が選手を選択すると<br />
                        投票できるようになります
                    </p>
                    <div className="mt-6">
                        <span className="badge badge-accent animate-pulse">準備中</span>
                    </div>
                </div>
            </div>
        );
    }

    // 既に投票済みの場合
    if (hasVoted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="card p-8 text-center max-w-md w-full animate-fadeIn">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-600 flex items-center justify-center mx-auto mb-6">
                        <span className="text-5xl">✓</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">投票完了！</h2>
                    <p className="text-[var(--text-muted)] mb-4">
                        <span className="text-[var(--foreground)] font-bold">{currentRider.name}</span>
                        <br />に投票しました
                    </p>
                    <div className="flex justify-center gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span
                                key={star}
                                className={`text-3xl ${star <= (votedScore || 0) ? 'text-[var(--secondary)]' : 'text-[var(--surface-border)]'}`}
                            >
                                ★
                            </span>
                        ))}
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                        次の選手の投票開始をお待ちください
                    </p>
                </div>
            </div>
        );
    }

    // 投票可能な状態
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="card p-8 text-center max-w-md w-full animate-fadeIn">
                {/* Header */}
                <div className="mb-6">
                    <span className="badge badge-accent mb-4">投票受付中</span>
                    <h1 className="text-xl font-bold mb-2">🎉 観客投票</h1>
                </div>

                {/* Current Rider */}
                <div className="mb-8">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden bg-[var(--surface-light)] flex items-center justify-center">
                        {currentRider.photo && currentRider.photo !== '/images/default-rider.png' ? (
                            <img
                                src={currentRider.photo}
                                alt={currentRider.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-5xl">🚴</span>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold">{currentRider.name}</h2>
                    <p className="text-[var(--text-muted)]">{currentRider.riderName}</p>
                </div>

                {/* Vote Button */}
                <button
                    onClick={handleVote}
                    className="btn btn-secondary w-full text-lg py-4"
                >
                    この選手に投票する →
                </button>
            </div>
        </div>
    );
}
