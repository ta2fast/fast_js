'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rider } from '@/types';

const JUDGES = [
    { id: 'judge1', name: 'ジャッジ1' },
    { id: 'judge2', name: 'ジャッジ2' },
    { id: 'judge3', name: 'ジャッジ3' },
];

export default function JudgePage() {
    const router = useRouter();
    const [selectedJudge, setSelectedJudge] = useState<string | null>(null);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRiders();
    }, []);

    async function fetchRiders() {
        try {
            const res = await fetch('/api/riders');
            const data = await res.json();
            if (data.success) {
                setRiders(data.data.sort((a: Rider, b: Rider) => a.displayOrder - b.displayOrder));
            }
        } catch (error) {
            console.error('Failed to fetch riders:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleRiderSelect(riderId: string) {
        if (!selectedJudge) return;
        router.push(`/judge/score/${riderId}?judgeId=${selectedJudge}`);
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <header className="text-center mb-8 animate-fadeIn">
                <div className="inline-flex items-center gap-3 mb-2">
                    <span className="text-4xl">📋</span>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
                        ジャッジ採点
                    </h1>
                </div>
                <p className="text-[var(--text-muted)]">
                    技術評価を採点してください
                </p>
            </header>

            {/* Judge Selection */}
            <section className="card mb-8 animate-fadeIn">
                <h2 className="text-lg font-bold mb-4">ジャッジ選択</h2>
                <div className="flex flex-wrap gap-3">
                    {JUDGES.map((judge) => (
                        <button
                            key={judge.id}
                            onClick={() => setSelectedJudge(judge.id)}
                            className={`btn ${selectedJudge === judge.id
                                    ? 'btn-primary'
                                    : 'btn-ghost'
                                }`}
                        >
                            {judge.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* Rider Selection */}
            <section className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-lg font-bold mb-4">選手を選択</h2>

                {loading ? (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                        読み込み中...
                    </div>
                ) : riders.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-muted)]">
                        選手が登録されていません
                    </div>
                ) : (
                    <div className="space-y-3">
                        {riders.map((rider, index) => (
                            <button
                                key={rider.id}
                                onClick={() => handleRiderSelect(rider.id)}
                                disabled={!selectedJudge}
                                className="rider-card w-full text-left animate-slideIn"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-xl">
                                    🏍️
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold">{rider.name}</h3>
                                    <p className="text-sm text-[var(--text-muted)]">
                                        {rider.riderName}
                                    </p>
                                </div>
                                <span className="text-[var(--text-muted)]">→</span>
                            </button>
                        ))}
                    </div>
                )}

                {!selectedJudge && riders.length > 0 && (
                    <p className="text-center text-[var(--text-muted)] mt-4">
                        ※ ジャッジを選択してください
                    </p>
                )}
            </section>
        </div>
    );
}
