'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rider, Judge } from '@/types';

export default function JudgePage() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [judges, setJudges] = useState<Judge[]>([]);
    const [selectedJudge, setSelectedJudge] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // クライアントサイドでマウント後にlocalStorageを読み込む
    useEffect(() => {
        setMounted(true);
        const storedJudgeId = localStorage.getItem('bmx_judge_id');
        if (storedJudgeId) {
            setSelectedJudge(storedJudgeId);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const [ridersRes, judgesRes] = await Promise.all([
                fetch('/api/riders'),
                fetch('/api/judge/status'),
            ]);

            const ridersData = await ridersRes.json();
            const judgesData = await judgesRes.json();

            if (ridersData.success) setRiders(ridersData.data);
            if (judgesData.success && judgesData.data.judges) {
                setJudges(judgesData.data.judges);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleJudgeSelect(judgeId: string) {
        setSelectedJudge(judgeId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('bmx_judge_id', judgeId);
        }
    }

    function handleRiderSelect(riderId: string) {
        if (!selectedJudge) {
            alert('ジャッジを選択してください');
            return;
        }
        router.push(`/judge/score/${riderId}?judgeId=${selectedJudge}`);
    }

    if (loading || !mounted) {
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
                <h1 className="text-2xl font-bold text-center mb-2">📋 ジャッジ採点</h1>
                <p className="text-center text-[var(--text-muted)]">
                    技術評価を採点してください
                </p>
            </header>

            {/* Judge Selection */}
            <div className="card mb-6">
                <h2 className="font-bold mb-3">ジャッジ選択</h2>
                <div className="flex flex-wrap gap-2">
                    {judges.map((judge) => (
                        <button
                            key={judge.id}
                            onClick={() => handleJudgeSelect(judge.id)}
                            className={`btn ${selectedJudge === judge.id ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {judge.name}
                        </button>
                    ))}
                </div>
                {selectedJudge && (
                    <p className="mt-3 text-sm text-[var(--accent)]">
                        ✓ {judges.find(j => j.id === selectedJudge)?.name} として採点
                    </p>
                )}
            </div>

            {/* Rider List */}
            <div className="space-y-3">
                <h2 className="font-bold mb-3">選手を選択</h2>
                {riders.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-8">
                        選手が登録されていません
                    </div>
                ) : (
                    riders.map((rider, index) => (
                        <div
                            key={rider.id}
                            onClick={() => handleRiderSelect(rider.id)}
                            className="rider-card animate-slideIn"
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
                                <span className="text-sm text-[var(--text-muted)]">{rider.riderName}</span>
                            </div>

                            {/* Arrow */}
                            <div className="text-[var(--primary)] text-2xl">→</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
