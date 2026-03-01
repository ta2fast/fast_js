'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Rider, ContestSettings, EvaluationItem, JudgeItemScore } from '@/types';
import { calculateJudgeScore, calculateMaxJudgeScore } from '@/lib/scoring';

export default function JudgeScorePage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const riderId = params.riderId as string;
    const judgeId = searchParams.get('judgeId') || '';

    const [rider, setRider] = useState<Rider | null>(null);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [alreadyScored, setAlreadyScored] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const storedJudgeId = localStorage.getItem('fast_judge_id');
        const finalJudgeId = judgeId || storedJudgeId;

        if (!finalJudgeId) {
            router.push('/judge/login');
            return;
        }
        fetchData(finalJudgeId);
    }, [riderId, judgeId]);

    async function fetchData(fJudgeId: string) {
        try {
            const [ridersRes, settingsRes, statusRes] = await Promise.all([
                fetch('/api/riders'),
                fetch('/api/admin/settings'),
                fetch(`/api/judge/status?judgeId=${fJudgeId}&riderId=${riderId}`),
            ]);

            const ridersData = await ridersRes.json();
            const settingsData = await settingsRes.json();
            const statusData = await statusRes.json();

            if (ridersData.success) {
                const found = ridersData.data.find((r: Rider) => r.id === riderId);
                setRider(found || null);
            }

            if (settingsData.success) {
                setSettings(settingsData.data);
            }

            if (statusData.success && statusData.data.hasScored) {
                setAlreadyScored(true);
                if (statusData.data.scores) {
                    const initialScores: Record<string, number> = {};
                    statusData.data.scores.forEach((s: { itemId: string; score: number }) => {
                        initialScores[s.itemId] = s.score;
                    });
                    setScores(initialScores);
                }
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('データの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }

    // 有効な評価項目
    const enabledItems = useMemo(() => {
        return settings?.evaluationItems.filter(item => item.enabled).sort((a, b) => a.order - b.order) || [];
    }, [settings]);

    // 現在のスコアを計算
    const currentScore = useMemo(() => {
        const itemScores: JudgeItemScore[] = Object.entries(scores).map(([itemId, score]) => ({
            itemId,
            score,
        }));
        return calculateJudgeScore(itemScores, enabledItems);
    }, [scores, enabledItems]);

    // 最大スコア
    const maxScore = useMemo(() => {
        return calculateMaxJudgeScore(enabledItems);
    }, [enabledItems]);

    // 全項目入力済みか
    const allScored = useMemo(() => {
        return enabledItems.every(item => scores[item.id] !== undefined);
    }, [enabledItems, scores]);

    function handleScoreChange(itemId: string, score: number) {
        setScores(prev => ({ ...prev, [itemId]: score }));
    }

    const handleSubmit = useCallback(async () => {
        if (!allScored || submitting) return;

        setSubmitting(true);
        setError(null);

        const itemScores: JudgeItemScore[] = Object.entries(scores).map(([itemId, score]) => ({
            itemId,
            score,
        }));

        const storedJudgeId = localStorage.getItem('fast_judge_id');
        const finalJudgeId = judgeId || storedJudgeId;

        try {
            const res = await fetch('/api/judge/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    judgeId: finalJudgeId,
                    riderId,
                    scores: itemScores,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setSubmitted(true);
                setShowConfirm(false);
            } else {
                setError(data.error || '送信に失敗しました');
                setShowConfirm(false);
            }
        } catch (err) {
            console.error('Failed to submit score:', err);
            setError('送信に失敗しました');
            setShowConfirm(false);
        } finally {
            setSubmitting(false);
        }
    }, [allScored, submitting, scores, judgeId, riderId]);

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
                <button onClick={() => router.push('/judge')} className="btn btn-primary">
                    戻る
                </button>
            </div>
        );
    }


    // 採点完了
    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fadeIn">
                <div className="card p-8 text-center max-w-md w-full">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent)] to-emerald-600 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">✓</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">採点完了！</h2>
                    <p className="text-[var(--text-muted)] mb-2">
                        <span className="text-[var(--foreground)] font-bold">{rider.name}</span>
                    </p>
                    <p className="text-4xl font-bold mb-6 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
                        {currentScore} / {maxScore} 点
                    </p>
                    <button
                        onClick={() => router.push('/judge/main')}
                        className="btn btn-primary w-full"
                    >
                        選手一覧に戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 pb-32">
            {/* Header */}
            <header className="mb-6">
                <button
                    onClick={() => router.push('/judge/main')}
                    className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors mb-4"
                >
                    ← 戻る
                </button>
            </header>

            {/* Rider Info */}
            <div className="card mb-6 animate-fadeIn">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-2xl">
                        🏍️
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{rider.name}</h2>
                        <span className="text-sm text-[var(--text-muted)]">{rider.riderName}</span>
                    </div>
                </div>
            </div>

            {/* Scoring Items */}
            <div className="space-y-4 mb-6">
                {enabledItems.map((item, index) => (
                    <ScoreItem
                        key={item.id}
                        item={item}
                        score={scores[item.id]}
                        onScoreChange={(score) => handleScoreChange(item.id, score)}
                        index={index}
                    />
                ))}
            </div>

            {error && (
                <p className="text-[var(--danger)] text-center mb-4">{error}</p>
            )}

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 glass p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[var(--text-muted)]">合計点</span>
                    <span className="text-2xl font-bold">
                        <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
                            {currentScore}
                        </span>
                        <span className="text-[var(--text-muted)] text-lg"> / {maxScore}</span>
                    </span>
                </div>
                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!allScored}
                    className="btn btn-primary w-full text-lg py-4"
                >
                    {alreadyScored ? '採点を更新する' : '採点を確定する'}
                </button>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4 text-center">
                            {alreadyScored ? '採点を更新しますか？' : '採点を確定しますか？'}
                        </h3>
                        <p className="text-[var(--text-muted)] text-center mb-2">
                            {rider.name}
                        </p>
                        <p className="text-3xl font-bold text-center mb-6">
                            {currentScore} / {maxScore} 点
                        </p>
                        <div className="space-y-2 mb-6">
                            {enabledItems.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-[var(--text-muted)]">{item.name}</span>
                                    <span>
                                        {scores[item.id]} × {item.weight} = {(scores[item.id] || 0) * item.weight}pt
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-[var(--danger)] text-sm mb-4">
                            {alreadyScored ? '⚠️ 更新後のデータが保存されます' : '⚠️ 確定後は変更が反映されます'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="btn btn-ghost flex-1"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="btn btn-primary flex-1"
                            >
                                {submitting ? '送信中...' : (alreadyScored ? '更新する' : '確定する')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Score Item Component
function ScoreItem({
    item,
    score,
    onScoreChange,
    index
}: {
    item: EvaluationItem;
    score: number | undefined;
    onScoreChange: (score: number) => void;
    index: number;
}) {
    const scoreRange = Array.from(
        { length: item.maxScore - item.minScore + 1 },
        (_, i) => item.minScore + i
    );

    const itemScore = score !== undefined ? score * item.weight : 0;
    const maxItemScore = item.maxScore * item.weight;

    return (
        <div
            className="card animate-slideIn"
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="text-sm text-[var(--text-muted)]">
                        ウエイト: ×{item.weight}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-lg font-bold text-[var(--primary)]">
                        {itemScore}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">
                        /{maxItemScore}pt
                    </span>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
                {scoreRange.map((s) => (
                    <button
                        key={s}
                        onClick={() => onScoreChange(s)}
                        className={`score-btn ${score === s ? 'active' : ''}`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}
