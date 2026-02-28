'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContestSettings, EvaluationItem, ApiResponse } from '@/types';

export default function ResultsControlPage() {
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [labelDelaySec, setLabelDelaySec] = useState(3);
    const [barDurationSec, setBarDurationSec] = useState(3);
    const [sortDelaySec, setSortDelaySec] = useState(3);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            const data: ApiResponse<ContestSettings> = await res.json();
            if (data.success && data.data) {
                setSettings(data.data);
                setLabelDelaySec((data.data.animationDelayLabelMs ?? 3000) / 1000);
                setBarDurationSec((data.data.animationDelayBarMs ?? 3000) / 1000);
                setSortDelaySec((data.data.animationDelaySortMs ?? 3000) / 1000);
            } else {
                alert(`設定の読み込みに失敗しました: ${data.error || '不明なエラー'}`);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            alert('通信エラーが発生しました。サーバーの状態を確認してください。');
        } finally {
            setLoading(false);
        }
    };

    const updateReveals = async (newRevealedIds: string[]) => {
        if (!settings) return;
        setUpdating(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revealedItemIds: newRevealedIds }),
            });
            const data: ApiResponse<ContestSettings> = await res.json();
            if (data.success && data.data) {
                setSettings(data.data);
            } else {
                alert(`更新に失敗しました: ${data.error || '不明なエラー'}`);
            }
        } catch (error) {
            console.error('Failed to update revealed items:', error);
            alert('通信エラーが発生しました。');
        } finally {
            setUpdating(false);
        }
    };

    const updateAnimationDelays = async (label: number, bar: number, sort: number) => {
        if (!settings) return;
        setUpdating(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    animationDelayLabelMs: Math.round(label * 1000),
                    animationDelayBarMs: Math.round(bar * 1000),
                    animationDelaySortMs: Math.round(sort * 1000),
                }),
            });
            const data: ApiResponse<ContestSettings> = await res.json();
            if (data.success && data.data) {
                setSettings(data.data);
            }
        } catch (error) {
            console.error('Failed to update animation delays:', error);
        } finally {
            setUpdating(false);
        }
    };

    const toggleItem = (itemId: string) => {
        if (!settings) return;
        const current = settings.revealedItemIds || [];
        const next = current.includes(itemId)
            ? current.filter(id => id !== itemId)
            : [...current, itemId];
        updateReveals(next);
    };

    const revealAll = () => {
        if (!settings) return;
        const allIds = [
            ...settings.evaluationItems.map(item => item.id),
            'audience'
        ];
        updateReveals(allIds);
    };

    const hideAll = () => {
        updateReveals([]);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-xl text-[var(--text-muted)]">読み込み中...</div>
            </div>
        );
    }

    if (!settings) return null;

    const evaluationItems = settings.evaluationItems.filter(item => item.enabled);
    const revealedIds = settings.revealedItemIds || [];

    return (
        <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">📊 リザルト表示コントロール</h1>
                        <p className="text-[var(--text-muted)]">リザルト画面での項目表示を制御します</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/admin" className="btn btn-ghost btn-sm">← 管理画面</Link>
                    </div>
                </header>

                <div className="grid gap-6">
                    <section className="card">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="w-2 h-6 bg-[var(--secondary)] rounded-full"></span>
                            表示コントロール
                        </h2>

                        <div className="flex flex-wrap gap-4 mb-8">
                            <button
                                onClick={revealAll}
                                disabled={updating}
                                className="btn btn-outline flex-1 border-dashed"
                            >
                                全て表示
                            </button>
                            <button
                                onClick={hideAll}
                                disabled={updating}
                                className="btn btn-outline flex-1 border-dashed"
                            >
                                全て非表示
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {evaluationItems.map((item) => {
                                const isRevealed = revealedIds.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => toggleItem(item.id)}
                                        disabled={updating}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isRevealed
                                            ? 'border-[var(--secondary)] bg-[var(--secondary-light)] shadow-sm'
                                            : 'border-[var(--surface-light)] bg-transparent opacity-60 grayscale hover:opacity-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isRevealed ? 'bg-[var(--secondary)] text-white' : 'bg-slate-200 text-slate-500'
                                                }`}>
                                                {item.order}
                                            </div>
                                            <span className="text-xl font-bold">{item.name}</span>
                                        </div>
                                        <div className={`px-4 py-1 rounded-full text-sm font-bold ${isRevealed ? 'bg-white text-[var(--secondary)]' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            {isRevealed ? '表示中' : '非表示'}
                                        </div>
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => toggleItem('audience')}
                                disabled={updating}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${revealedIds.includes('audience')
                                    ? 'border-[var(--secondary)] bg-[var(--secondary-light)] shadow-sm'
                                    : 'border-[var(--surface-light)] bg-transparent opacity-60 grayscale hover:opacity-100'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${revealedIds.includes('audience') ? 'bg-[var(--secondary)] text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                        👥
                                    </div>
                                    <span className="text-xl font-bold">観客投票点</span>
                                </div>
                                <div className={`px-4 py-1 rounded-full text-sm font-bold ${revealedIds.includes('audience') ? 'bg-white text-[var(--secondary)]' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    {revealedIds.includes('audience') ? '表示中' : '非表示'}
                                </div>
                            </button>
                        </div>
                    </section>

                    {/* Animation Timing Settings */}
                    <section className="card">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
                            ⏱ アニメーションタイミング設定
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2 font-bold">
                                    ① 項目名の表示時間
                                </label>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={labelDelaySec}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setLabelDelaySec(val);
                                            updateAnimationDelays(val, barDurationSec, sortDelaySec);
                                        }}
                                        className="input flex-1 border-amber-200"
                                    >
                                        {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10].map(v => (
                                            <option key={v} value={v}>{v} 秒</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    中央に項目ラベルが表示され、「タメ」を作る時間
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2 font-bold">
                                    ② バーの伸長スピード
                                </label>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={barDurationSec}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setBarDurationSec(val);
                                            updateAnimationDelays(labelDelaySec, val, sortDelaySec);
                                        }}
                                        className="input flex-1 border-amber-200"
                                    >
                                        {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(v => (
                                            <option key={v} value={v}>{v} 秒</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    バーが伸び、数値がカウントアップする所要時間
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2 font-bold">
                                    ③ 並べ替え待ち時間
                                </label>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={sortDelaySec}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            setSortDelaySec(val);
                                            updateAnimationDelays(labelDelaySec, barDurationSec, val);
                                        }}
                                        className="input flex-1 border-amber-200"
                                    >
                                        {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(v => (
                                            <option key={v} value={v}>{v} 秒</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    全てが確定してから、順位が入れ替わるまでの待機時間
                                </p>
                            </div>
                        </div>
                    </section>

                    <aside className="p-4 bg-[var(--surface-light)] rounded-xl border border-[var(--surface-border)]">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <span className="text-amber-500">💡</span> 使い方
                        </h3>
                        <ul className="text-sm text-[var(--text-muted)] space-y-1 list-disc list-inside">
                            <li>この画面のボタンをクリックすると、公開中のリザルト画面に即座に反映されます。</li>
                            <li>会場のプロジェクター等でリザルト画面を投影しながら操作してください。</li>
                            <li>項目は一つずつ順番に表示していく演出がおすすめです。</li>
                            <li>アニメーションタイミングは秒単位で調整できます。値を変更後、フォーカスを外すと保存されます。</li>
                        </ul>
                    </aside>
                </div>
            </div>

            <style jsx>{`
        .btn-outline {
          border: 2px solid var(--surface-border);
          background: transparent;
          color: var(--text-muted);
        }
        .btn-outline:hover {
          background: var(--surface-light);
          border-color: var(--text-base);
          color: var(--text-base);
        }
      `}</style>
        </div>
    );
}
