'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContestSettings, EvaluationItem, ApiResponse, AnimationSettings } from '@/types';

export default function ResultsControlPage() {
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [labelDelaySec, setLabelDelaySec] = useState(3);
    const [barDurationSec, setBarDurationSec] = useState(3);
    const [sortDelaySec, setSortDelaySec] = useState(3);
    const [sortDurationSec, setSortDurationSec] = useState(0.8);
    const [animationStyle, setAnimationStyle] = useState<'Standard' | 'Pop-in' | 'Slide' | 'Flash'>('Standard');
    const [labelFontSize, setLabelFontSize] = useState<'Small' | 'Medium' | 'Large' | 'Extra Large'>('Medium');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            // Fetch animation settings from dedicated table
            const animRes = await fetch('/api/admin/animation-settings');
            const animData: ApiResponse<AnimationSettings> = await animRes.json();

            if (animData.success && animData.data) {
                const s = animData.data;
                setLabelDelaySec(Number(s.label_display_time));
                setBarDurationSec(Number(s.bar_transition_speed));
                setSortDelaySec(Number(s.sort_delay_time));
                setSortDurationSec(Number(s.sort_transition_speed));
                setAnimationStyle(s.animation_style || 'Standard');
                setLabelFontSize(s.label_font_size || 'Medium');
            }

            // Fetch general contest settings (for revealed items)
            const res = await fetch('/api/admin/settings');
            const data: ApiResponse<ContestSettings> = await res.json();
            if (data.success && data.data) {
                setSettings(data.data);
            } else {
                alert(`設定の読み込みに失敗しました: ${data.error || '不明なエラー'}`);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            alert('通信エラーが発生しました。');
        } finally {
            setLoading(false);
        }
    };

    const updateReveals = async (newRevealedIds: string[], triggerItemId?: string) => {
        if (!settings) return;
        setUpdating(true);
        try {
            // Step 1: Update the revealed item IDs (data sync)
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
                return;
            }

            // Step 2: If a trigger item is specified, send animation trigger
            if (triggerItemId) {
                await fetch('/api/admin/animation-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        is_running: true,
                        target_item_id: triggerItemId,
                    }),
                });
            }
        } catch (error) {
            console.error('Failed to update revealed items:', error);
            alert('通信エラーが発生しました。');
        } finally {
            setUpdating(false);
        }
    };

    async function updateAnimationDelays(labelS: number, barS: number, sortDelayS: number, sortDurationS: number, style: string, size: string) {
        setUpdating(true);
        try {
            const res = await fetch('/api/admin/animation-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label_display_time: labelS,
                    bar_transition_speed: barS,
                    sort_delay_time: sortDelayS,
                    sort_transition_speed: sortDurationS,
                    animation_style: style,
                    label_font_size: size,
                }),
            });
            const data: ApiResponse<AnimationSettings> = await res.json();
            if (data.success) {
                alert('アニメーション設定を保存しました。');
            } else {
                alert(`更新に失敗しました: ${data.error || '不明なエラー'}`);
            }
        } catch (error) {
            console.error('Failed to update animation settings:', error);
            alert('通信エラーが発生しました。');
        } finally {
            setUpdating(false);
        }
    }

    const toggleItem = (itemId: string) => {
        if (!settings) return;
        const current = settings.revealedItemIds || [];
        const isAdding = !current.includes(itemId);
        const next = isAdding
            ? [...current, itemId]
            : current.filter(id => id !== itemId);
        // Only trigger animation when adding (revealing) an item
        updateReveals(next, isAdding ? itemId : undefined);
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
                                onClick={async () => {
                                    if (!settings) return;
                                    setUpdating(true);
                                    try {
                                        const revealedIds = settings.revealedItemIds || [];
                                        const lastItemId = revealedIds.length > 0 ? revealedIds[revealedIds.length - 1] : null;
                                        await fetch('/api/admin/animation-settings', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                is_running: true,
                                                target_item_id: lastItemId,
                                            }),
                                        });
                                        alert('表示を開始します');
                                    } catch (e) {
                                        alert('エラーが発生しました');
                                    } finally {
                                        setUpdating(false);
                                    }
                                }}
                                disabled={updating}
                                className="btn btn-primary flex-1 shadow-lg shadow-[var(--secondary)]/20"
                            >
                                🎬 表示開始（確定実行）
                            </button>
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
                        {/* 演出設定 */}
                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 mb-6">
                            <h3 className="text-sm font-bold text-zinc-500 mb-4 tracking-widest uppercase">演出カスタマイズ</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 mb-2">演出スタイル</label>
                                    <select
                                        value={animationStyle}
                                        onChange={(e) => {
                                            const val = e.target.value as any;
                                            setAnimationStyle(val);
                                            updateAnimationDelays(labelDelaySec, barDurationSec, sortDelaySec, sortDurationSec, val, labelFontSize);
                                        }}
                                        className="w-full bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#fffa00]"
                                    >
                                        <option value="Standard">Standard (Fade)</option>
                                        <option value="Pop-in">Pop-in (Bounce)</option>
                                        <option value="Slide">Slide (From Left)</option>
                                        <option value="Flash">Flash (Impact)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 mb-2">文字サイズ</label>
                                    <select
                                        value={labelFontSize}
                                        onChange={(e) => {
                                            const val = e.target.value as any;
                                            setLabelFontSize(val);
                                            updateAnimationDelays(labelDelaySec, barDurationSec, sortDelaySec, sortDurationSec, animationStyle, val);
                                        }}
                                        className="w-full bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#fffa00]"
                                    >
                                        <option value="Small">Small</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Large">Large</option>
                                        <option value="Extra Large">Extra Large</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 mb-2">①項目表示 (秒)</label>
                                <select
                                    value={labelDelaySec}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setLabelDelaySec(val);
                                        updateAnimationDelays(val, barDurationSec, sortDelaySec, sortDurationSec, animationStyle, labelFontSize);
                                    }}
                                    className="w-full bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#fffa00]"
                                >
                                    {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(v => (
                                        <option key={v} value={v}>{v}s</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                    項目ラベルが単独で表示される時間
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 mb-2">②バー伸長 (秒)</label>
                                <select
                                    value={barDurationSec}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setBarDurationSec(val);
                                        updateAnimationDelays(labelDelaySec, val, sortDelaySec, sortDurationSec, animationStyle, labelFontSize);
                                    }}
                                    className="w-full bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#fffa00]"
                                >
                                    {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10].map(v => (
                                        <option key={v} value={v}>{v}s</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                    0から確定値までバーが伸びる時間
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 mb-2">③整理待ち (秒)</label>
                                <select
                                    value={sortDelaySec}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setSortDelaySec(val);
                                        updateAnimationDelays(labelDelaySec, barDurationSec, val, sortDurationSec, animationStyle, labelFontSize);
                                    }}
                                    className="w-full bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#fffa00]"
                                >
                                    {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(v => (
                                        <option key={v} value={v}>{v}s</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                    伸びきった後の静止（余韻）時間
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 mb-2">④並替速さ (秒)</label>
                                <select
                                    value={sortDurationSec}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setSortDurationSec(val);
                                        updateAnimationDelays(labelDelaySec, barDurationSec, sortDelaySec, val, animationStyle, labelFontSize);
                                    }}
                                    className="w-full bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#fffa00]"
                                >
                                    {[0, 0.5, 0.8, 1, 1.5, 2, 2.5, 3].map(v => (
                                        <option key={v} value={v}>{v}s</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                    順位が入れ替わる動き自体の速さ
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
