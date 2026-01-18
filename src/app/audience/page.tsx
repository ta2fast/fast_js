'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rider, ContestSettings } from '@/types';
import { hasVotedForRider, getVoteRecord } from '@/lib/deviceId';

export default function AudiencePage() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [votedRiders, setVotedRiders] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchData();
        // 5秒ごとに更新
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // 投票済みの選手を確認
        const voted: Record<string, number> = {};
        riders.forEach(rider => {
            const record = getVoteRecord(rider.id);
            if (record) {
                voted[rider.id] = record.score;
            }
        });
        setVotedRiders(voted);
    }, [riders]);

    async function fetchData() {
        try {
            const [ridersRes, settingsRes] = await Promise.all([
                fetch('/api/riders'),
                fetch('/api/admin/settings'),
            ]);

            const ridersData = await ridersRes.json();
            const settingsData = await settingsRes.json();

            if (ridersData.success) setRiders(ridersData.data);
            if (settingsData.success) setSettings(settingsData.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleRiderClick(riderId: string) {
        if (!settings?.votingEnabled) {
            alert('現在、投票は受け付けていません');
            return;
        }
        if (votedRiders[riderId]) {
            alert(`既に ${votedRiders[riderId]} 点を投票済みです`);
            return;
        }
        router.push(`/audience/vote/${riderId}`);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-[var(--text-muted)]">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-24">
            {/* Header */}
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-center mb-2">🎉 観客投票</h1>
                <p className="text-center text-[var(--text-muted)]">
                    応援したい選手をタップして投票！
                </p>
            </header>

            {/* Voting Status */}
            <div className="mb-6">
                {settings?.votingEnabled ? (
                    <div className="glass rounded-xl p-4 text-center">
                        <span className="badge badge-accent">投票受付中</span>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            選手をタップして投票してください
                        </p>
                    </div>
                ) : (
                    <div className="glass rounded-xl p-4 text-center">
                        <span className="badge badge-danger">投票停止中</span>
                        <p className="mt-2 text-sm text-[var(--text-muted)]">
                            投票開始をお待ちください
                        </p>
                    </div>
                )}
            </div>

            {/* Rider List */}
            <div className="space-y-3">
                {riders.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-8">
                        選手が登録されていません
                    </div>
                ) : (
                    riders.map((rider, index) => (
                        <div
                            key={rider.id}
                            onClick={() => handleRiderClick(rider.id)}
                            className={`rider-card animate-slideIn ${votedRiders[rider.id] ? 'voted' : ''}`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            {/* Photo */}
                            <div className="rider-photo flex items-center justify-center text-2xl bg-[var(--surface-light)]">
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

                            {/* Info */}
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{rider.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="rider-number text-sm w-8 h-8">
                                        {rider.number}
                                    </span>
                                    {votedRiders[rider.id] && (
                                        <span className="badge badge-accent">
                                            {votedRiders[rider.id]}点投票済み ✓
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Arrow */}
                            {!votedRiders[rider.id] && settings?.votingEnabled && (
                                <div className="text-[var(--primary)] text-2xl">→</div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Back Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 glass">
                <button
                    onClick={() => router.push('/')}
                    className="btn btn-ghost w-full"
                >
                    ← トップに戻る
                </button>
            </div>
        </div>
    );
}
