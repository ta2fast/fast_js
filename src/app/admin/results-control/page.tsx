'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContestSettings, DEFAULT_CONTEST_SETTINGS } from '@/types';
import { supabase } from '@/lib/supabase';

export default function ResultsControlPage() {
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [revealedIds, setRevealedIds] = useState<string[]>([]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        // Fallback since setting table is removed
        setSettings(DEFAULT_CONTEST_SETTINGS);
        setLoading(false);
    };

    const triggerRevealItem = (itemId: string, itemName: string) => {
        setUpdating(true);
        // Payload 送信
        supabase.channel('animation_control').send({
            type: 'broadcast',
            event: 'reveal_item',
            payload: { itemId, itemName }
        }).then(() => {
            setRevealedIds(prev => [...new Set([...prev, itemId])]);
            setTimeout(() => setUpdating(false), 300);
        });
    };

    const triggerSortRanks = () => {
        setUpdating(true);
        supabase.channel('animation_control').send({
            type: 'broadcast',
            event: 'sort_ranks',
            payload: {}
        }).then(() => {
            setTimeout(() => setUpdating(false), 300);
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

    const evaluationItems = settings.evaluationItems.filter(item => item.enabled);

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
                        <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-6 bg-[var(--secondary)] rounded-full"></span>
                                表示コントロール
                            </div>
                            <button
                                onClick={triggerReset}
                                disabled={updating}
                                className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none shadow-sm"
                            >
                                🔄 オールクリア
                            </button>
                        </h2>

                        <div className="grid gap-3 mb-8">
                            {evaluationItems.map((item) => {
                                const isRevealed = revealedIds.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => triggerRevealItem(item.id, item.name)}
                                        disabled={updating}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${isRevealed
                                                ? 'border-zinc-700 bg-zinc-800 text-zinc-300 shadow-none'
                                                : 'border-[var(--secondary)] bg-[var(--secondary-light)] shadow-sm hover:brightness-110 active:scale-95'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isRevealed ? 'bg-zinc-700 text-zinc-400' : 'bg-[var(--secondary)] text-white'
                                                }`}>
                                                {item.order}
                                            </div>
                                            <span className="text-xl font-bold">
                                                {isRevealed ? `✅ 『${item.name}』 (発表済み)` : `『${item.name}』をアニメーション発表`}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => triggerRevealItem('audience', '観客投票点')}
                                disabled={updating}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${revealedIds.includes('audience')
                                        ? 'border-zinc-700 bg-zinc-800 text-zinc-300 shadow-none'
                                        : 'border-[#f87171] bg-[#f87171]/10 shadow-sm hover:brightness-110 active:scale-95'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${revealedIds.includes('audience') ? 'bg-zinc-700 text-zinc-400' : 'bg-[#f87171] text-white'
                                        }`}>
                                        👥
                                    </div>
                                    <span className={`text-xl font-bold ${revealedIds.includes('audience') ? '' : 'text-[#f87171]'}`}>
                                        {revealedIds.includes('audience') ? '✅ 『観客投票点』 (発表済み)' : '『観客投票点』をアニメーション発表'}
                                    </span>
                                </div>
                            </button>
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
                            <li><strong>手順1:</strong> スコア入力画面で先に全点数を入力してください。</li>
                            <li><strong>手順2:</strong> リザルト画面には最初「0点」の状態で順位が表示されています。</li>
                            <li><strong>手順3:</strong> 上のボタンを押すと、その項目だけのバーが伸びて部分的に合計点が更新されます。</li>
                            <li><strong>手順4:</strong> この段階では順位は入れ替わりません。全て発表後、「最終順位の入れ替えを実行」ボタンを押してください。</li>
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
