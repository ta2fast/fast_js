'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ContestSettings, Rider } from '@/types';
import { supabase } from '@/lib/supabase';
import { getSettings, getRiders } from '@/lib/store';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function ResultsControlPage() {
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [revealedIds, setRevealedIds] = useState<string[]>([]);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [announcedRiderIds, setAnnouncedRiderIds] = useState<string[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        fetchSettings();

        // Subscribe to the broadcast channel FIRST — required before sending
        const ch = supabase.channel('animation_control');
        ch.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[Admin] Subscribed to animation_control channel');
            }
        });
        channelRef.current = ch;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

    const fetchSettings = async () => {
        try {
            const [s, r] = await Promise.all([getSettings(), getRiders()]);
            setSettings(s);
            // Result display is usually reverse order for dramatic effect (last to first)
            setRiders(r.sort((a, b) => b.displayOrder - a.displayOrder));
            setAnnouncedRiderIds(s.announcedRiderIds || []);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendBroadcast = useCallback((event: string, payload: Record<string, any> = {}) => {
        const ch = channelRef.current;
        if (!ch) {
            console.error('[Admin] Channel not ready');
            return;
        }
        setUpdating(true);
        ch.send({
            type: 'broadcast',
            event,
            payload
        }).then(() => {
            const delay = event === 'sort_ranks' ? 2000 : 300;
            setTimeout(() => setUpdating(false), delay);
        });
    }, []);

    const triggerShowLabel = (itemName: string) => {
        sendBroadcast('show_label', { itemName });
    };

    const triggerHideLabel = () => {
        sendBroadcast('hide_label');
    };

    const triggerRevealScore = (itemId: string, itemName: string) => {
        sendBroadcast('reveal_score', { itemId, itemName });
        setRevealedIds(prev => [...new Set([...prev, itemId])]);
    };

    const triggerSortRanks = () => {
        sendBroadcast('sort_ranks');
    };

    const triggerReset = () => {
        if (!window.confirm('本当にすべての結果表示をリセットしてよろしいですか？\n※リザルト画面のバーがすべて0に戻ります。')) {
            return;
        }
        sendBroadcast('reset', { reloadSettings: true });
        setRevealedIds([]);
        setAnnouncedRiderIds([]);

        // Database reset
        import('@/lib/store').then(({ resetRevelations }) => resetRevelations());
    };


    const triggerFocusRider = (riderId: string) => {
        sendBroadcast('focus_rider', { riderId });
    };

    const triggerRevealTry2Score = async (riderId: string) => {
        sendBroadcast('reveal_try2_score', { riderId });
        setAnnouncedRiderIds(prev => [...new Set([...prev, riderId])]);
        try {
            const { revealRiderTry } = await import('@/lib/store');
            await revealRiderTry(riderId);
        } catch (error) {
            console.error('Failed to update announced riders:', error);
        }
    };

    const toggleTry = async () => {
        if (!settings) return;
        const newTry = settings.currentTry === 1 ? 2 : 1;
        setUpdating(true);
        try {
            const { updateSettings } = await import('@/lib/store');
            await updateSettings({ currentTry: newTry });
            setSettings({ ...settings, currentTry: newTry });
        } catch (error) {
            console.error('Failed to update try number:', error);
            alert('試技の切り替えに失敗しました');
        } finally {
            setUpdating(false);
        }
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
                        <h1 className="text-3xl font-bold mb-2">📊 結果発表発表</h1>
                        <p className="text-[var(--text-muted)]">リザルト画面での結果発表演出を手動で制御します</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
                            <button
                                onClick={() => settings.currentTry !== 1 && toggleTry()}
                                disabled={updating}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${settings.currentTry === 1
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                1st Try
                            </button>
                            <button
                                onClick={() => settings.currentTry !== 2 && toggleTry()}
                                disabled={updating}
                                className={`px-4 py-2 rounded-lg font-bold transition-all ${settings.currentTry === 2
                                    ? 'bg-emerald-600 text-white shadow-lg'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                            >
                                2nd Try
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Link href="/admin/animation-settings" className="btn btn-outline btn-sm">
                                ⚙️ アニメ設定
                            </Link>
                            <Link href="/admin" className="btn btn-ghost btn-sm">← 管理画面</Link>
                        </div>
                    </div>
                </header>

                <div className="grid gap-6">
                    <section className="card">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <span className="w-2 h-6 bg-[var(--secondary)] rounded-full"></span>
                                発表工程コントロール
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

                        {settings.currentTry === 1 ? (
                            <div className="grid gap-6 mb-8">
                                {evaluationItems.map((item) => {
                                    const isRevealed = revealedIds.includes(item.id);
                                    return (
                                        <div key={item.id} className="p-5 rounded-2xl border-2 border-zinc-800 bg-zinc-900/50 shadow-inner">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-zinc-700 text-zinc-300">
                                                    {item.order}
                                                </div>
                                                <span className="text-xl font-black text-white tracking-tight">
                                                    『{item.name}』の発表
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <button
                                                    onClick={() => triggerShowLabel(item.name)}
                                                    disabled={updating}
                                                    className="btn py-4 flex flex-col gap-1 bg-zinc-100 hover:bg-white text-black font-bold border-none h-auto"
                                                >
                                                    <span className="text-xs opacity-60">STEP 1</span>
                                                    <span>項目表示</span>
                                                </button>
                                                <button
                                                    onClick={() => triggerRevealScore(item.id, item.name)}
                                                    disabled={updating}
                                                    className={`btn py-4 flex flex-col gap-1 font-bold border-none h-auto transition-all ${isRevealed
                                                        ? 'bg-zinc-800 text-zinc-500'
                                                        : 'bg-[var(--secondary)] text-white shadow-lg hover:brightness-110 active:scale-95'
                                                        }`}
                                                >
                                                    <span className="text-xs opacity-60">STEP 2</span>
                                                    <span>{isRevealed ? '✅ スコア表示済' : 'スコア表示'}</span>
                                                </button>
                                                <button
                                                    onClick={triggerSortRanks}
                                                    disabled={updating}
                                                    className="btn py-4 flex flex-col gap-1 bg-[var(--primary)] text-white font-bold border-none h-auto shadow-lg hover:brightness-110 active:scale-95"
                                                >
                                                    <span className="text-xs opacity-60">STEP 3</span>
                                                    <span>順位入れ替え</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="p-5 rounded-2xl border-2 border-[#f87171]/30 bg-[#f87171]/5 shadow-inner">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-[#f87171] text-white">
                                            👥
                                        </div>
                                        <span className="text-xl font-black text-white tracking-tight">
                                            『観客投票点』の発表
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => triggerShowLabel('AUDIENCE SCORE')}
                                            disabled={updating}
                                            className="btn py-4 flex flex-col gap-1 bg-zinc-100 hover:bg-white text-black font-bold border-none h-auto"
                                        >
                                            <span className="text-xs opacity-60">STEP 1</span>
                                            <span>項目表示</span>
                                        </button>
                                        <button
                                            onClick={() => triggerRevealScore('audience', '観客投票点')}
                                            disabled={updating}
                                            className={`btn py-4 flex flex-col gap-1 font-bold border-none h-auto transition-all ${revealedIds.includes('audience')
                                                ? 'bg-zinc-800 text-zinc-500'
                                                : 'bg-[#f87171] text-white shadow-lg hover:brightness-110 active:scale-95'
                                                }`}
                                        >
                                            <span className="text-xs opacity-60">STEP 2</span>
                                            <span>{revealedIds.includes('audience') ? '✅ スコア表示済' : 'スコア表示'}</span>
                                        </button>
                                        <button
                                            onClick={triggerSortRanks}
                                            disabled={updating}
                                            className="btn py-4 flex flex-col gap-1 bg-[var(--primary)] text-white font-bold border-none h-auto shadow-lg hover:brightness-110 active:scale-95"
                                        >
                                            <span className="text-xs opacity-60">STEP 3</span>
                                            <span>順位入れ替え</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <section className="mt-4 p-6 rounded-3xl bg-zinc-900 border-2 border-emerald-500/30">
                                <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-emerald-400">
                                    <span className="text-3xl">🔥</span> 2nd Try 選手別発表
                                </h3>
                                <div className="grid gap-3">
                                    {riders.map((rider) => {
                                        const isAnnounced = announcedRiderIds.includes(rider.id);
                                        return (
                                            <div key={rider.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
                                                <div>
                                                    <span className="text-xs font-bold text-zinc-500 block">ORDER {rider.displayOrder}</span>
                                                    <span className="text-lg font-bold text-white">{rider.riderName}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => triggerFocusRider(rider.id)}
                                                        disabled={updating}
                                                        className="btn btn-sm px-4 h-12 rounded-xl font-bold bg-zinc-100 hover:bg-white text-black"
                                                    >
                                                        目立たせる
                                                    </button>
                                                    <button
                                                        onClick={() => triggerRevealTry2Score(rider.id)}
                                                        disabled={updating || isAnnounced}
                                                        className={`btn btn-sm px-4 h-12 rounded-xl font-bold transition-all ${isAnnounced
                                                            ? 'bg-zinc-700 text-zinc-500'
                                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                                            }`}
                                                    >
                                                        {isAnnounced ? '✅ 点数発表済' : '点数発表'}
                                                    </button>
                                                    <button
                                                        onClick={triggerSortRanks}
                                                        disabled={updating}
                                                        className="btn btn-sm bg-[var(--primary)] hover:brightness-110 text-white px-4 h-12 rounded-xl"
                                                    >
                                                        順位更新
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        <div className="border-t border-[var(--surface-border)] pt-8 mt-4 text-center">
                            <h2 className="text-xl font-bold mb-4 flex items-center justify-center gap-2 text-[var(--primary)]">
                                <span className="w-8 h-[2px] bg-[var(--primary)] opacity-30"></span>
                                発表終了
                                <span className="w-8 h-[2px] bg-[var(--primary)] opacity-30"></span>
                            </h2>
                            <p className="text-sm text-[var(--text-muted)] mb-6">全ての発表が完了したら、最後にリセットするか順位を確認してください</p>
                            <button
                                onClick={triggerSortRanks}
                                disabled={updating}
                                className="w-full btn btn-primary py-8 text-3xl shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-[1.02] active:scale-95 transition-all outline-none border-t-2 border-l-2 border-white/20"
                            >
                                🏆 最終順位確定表示 🏆
                            </button>
                        </div>
                    </section>
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
