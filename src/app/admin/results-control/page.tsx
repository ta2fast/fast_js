'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContestSettings } from '@/types';
import { supabase } from '@/lib/supabase';
import { getSettings } from '@/lib/store';

export default function ResultsControlPage() {
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [revealedIds, setRevealedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const triggerShowLabel = (itemName: string) => {
        setUpdating(true);
        supabase.channel('animation_control').send({
            type: 'broadcast',
            event: 'show_label',
            payload: { itemName }
        }).then(() => {
            setTimeout(() => setUpdating(false), 300);
        });
    };

    const triggerHideLabel = () => {
        setUpdating(true);
        supabase.channel('animation_control').send({
            type: 'broadcast',
            event: 'hide_label',
            payload: {}
        }).then(() => {
            setTimeout(() => setUpdating(false), 300);
        });
    };

    const triggerRevealScore = (itemId: string, itemName: string) => {
        setUpdating(true);
        supabase.channel('animation_control').send({
            type: 'broadcast',
            event: 'reveal_score',
            payload: { itemId, itemName }
        }).then(() => {
            setRevealedIds(prev => [...new Set([...prev, itemId])]);
            setTimeout(() => setUpdating(false), 300);
        });
    };

    const triggerQuickReveal = (itemId: string, itemName: string) => {
        setUpdating(true);
        supabase.channel('animation_control').send({
            type: 'broadcast',
            event: 'reveal_item',
            payload: { itemId, itemName }
        }).then(() => {
            setRevealedIds(prev => [...new Set([...prev, itemId])]);
            setTimeout(() => setUpdating(false), 8000); // Wait for long auto animation
        });
    };

    const triggerSortRanks = () => {
        setUpdating(true);
        supabase.channel('animation_control').send({
            type: 'broadcast',
            event: 'sort_ranks',
            payload: {}
        }).then(() => {
            setTimeout(() => setUpdating(false), 3000); // Wait for sort animation
        });
    };

    const triggerReset = () => {
        if (!window.confirm('本当にすべての結果表示をリセットしてよろしいですか？\n※リザルト画面のバーがすべて0に戻ります。')) {
            return;
        }
        setUpdating(true);
        supabase.channel('animation_control').send({
            type: 'broadcast',
            event: 'reset',
            payload: {}
        }).then(() => {
            setRevealedIds([]);
            setTimeout(() => setUpdating(false), 300);
        });
    };


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-xl text-[var(--text-muted)]">読み込み中...</div>
            </div>
        );
    }

    if (!settings) return null;

    const evaluationItems = settings.evaluationItems
        .filter(item => item.enabled)
        .sort((a, b) => a.order - b.order);

    return (
        <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">📊 結果発表</h1>
                        <p className="text-[var(--text-muted)]">リザルト画面での結果発表演出を制御します</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/admin/animation-settings" className="btn btn-outline btn-sm">
                            ⚙️ アニメ設定
                        </Link>
                        <Link href="/admin" className="btn btn-ghost btn-sm">← 管理画面</Link>
                    </div>
                </header>

                <div className="grid gap-6">
                    <section className="card">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="w-2 h-6 bg-[var(--secondary)] rounded-full"></span>
                                表示コントロール
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={triggerHideLabel}
                                    disabled={updating}
                                    className="btn btn-sm bg-zinc-700 hover:bg-zinc-600 text-white border-none shadow-sm"
                                >
                                    文字を消す
                                </button>
                                <button
                                    onClick={triggerReset}
                                    disabled={updating}
                                    className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none shadow-sm"
                                >
                                    🔄 オールクリア
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-4 mb-8">
                            {evaluationItems.map((item) => {
                                const isRevealed = revealedIds.includes(item.id);
                                return (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 p-4 rounded-xl border-2 border-zinc-800 bg-zinc-900/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-zinc-700 text-zinc-300">
                                                {item.order}
                                            </div>
                                            <span className="text-xl font-bold text-white">
                                                『{item.name}』
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => triggerShowLabel(item.name)}
                                                disabled={updating}
                                                className="btn btn-sm flex-1 md:flex-none bg-zinc-100 hover:bg-white text-black font-bold border-none"
                                            >
                                                1.項目名
                                            </button>
                                            <button
                                                onClick={() => triggerRevealScore(item.id, item.name)}
                                                disabled={updating}
                                                className={`btn btn-sm flex-1 md:flex-none font-bold border-none ${isRevealed
                                                    ? 'bg-zinc-700 text-zinc-400'
                                                    : 'bg-[var(--secondary)] text-white shadow-md hover:brightness-110'
                                                    }`}
                                            >
                                                {isRevealed ? '✅ 表示中' : '2.スコア'}
                                            </button>
                                            <button
                                                onClick={() => triggerQuickReveal(item.id, item.name)}
                                                disabled={updating}
                                                className="btn btn-sm border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500"
                                                title="項目名とスコアを自動で連続表示"
                                            >
                                                ⚡️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 p-4 rounded-xl border-2 border-zinc-800 bg-zinc-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-zinc-700 text-zinc-300">
                                        👥
                                    </div>
                                    <span className="text-xl font-bold text-white">
                                        『観客投票点』
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => triggerShowLabel('AUDIENCE SCORE')}
                                        disabled={updating}
                                        className="btn btn-sm flex-1 md:flex-none bg-zinc-100 hover:bg-white text-black font-bold border-none"
                                    >
                                        1.項目名
                                    </button>
                                    <button
                                        onClick={() => triggerRevealScore('audience', '観客投票点')}
                                        disabled={updating}
                                        className={`btn btn-sm flex-1 md:flex-none font-bold border-none ${revealedIds.includes('audience')
                                            ? 'bg-zinc-700 text-zinc-400'
                                            : 'bg-[#f87171] text-white shadow-md hover:brightness-110'
                                            }`}
                                    >
                                        {revealedIds.includes('audience') ? '✅ 表示中' : '2.スコア'}
                                    </button>
                                    <button
                                        onClick={() => triggerQuickReveal('audience', '観客投票点')}
                                        disabled={updating}
                                        className="btn btn-sm border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500"
                                        title="項目名とスコアを自動で連続表示"
                                    >
                                        ⚡️
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-[var(--surface-border)] pt-8 mt-4">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--primary)]">
                                <span className="w-2 h-6 bg-[var(--primary)] rounded-full"></span>
                                最終結果
                            </h2>
                            <button
                                onClick={triggerSortRanks}
                                disabled={updating}
                                className="w-full btn btn-primary py-6 text-2xl shadow-[0_0_20px_rgba(255,250,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all outline-none border-2 border-[#fffa00]"
                            >
                                🏆 順位入れ替え実行 🏆
                            </button>
                        </div>
                    </section>

                    <aside className="p-4 bg-[var(--surface-light)] rounded-xl border border-[var(--surface-border)]">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <span className="text-amber-500">💡</span> 使い方
                        </h3>
                        <ul className="text-sm text-[var(--text-muted)] space-y-2 list-disc list-inside">
                            <li><strong>手順1 (項目名):</strong> 各項目の「1.項目名」を押すと、リザルト画面に大きく項目名が表示されます。</li>
                            <li><strong>手順2 (スコア):</strong> 「2.スコア」を押すと、その項目のバーが伸びて部分的に合計点が更新されます。</li>
                            <li><strong>手順3 (全表示後):</strong> 全て発表後、一番下の「🏆 順位入れ替え実行 🏆」を押してください。</li>
                            <li><strong>💡 ⚡️ボタン:</strong> 名前表示からスコア表示までを自動で行います（従来の方式）。</li>
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
