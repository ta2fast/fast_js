'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rider, ContestSettings } from '@/types';
import { getRiders, getSettings, getJudgeScoresByJudge, releaseJudgeSeat } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export default function JudgeMainPage() {
    const router = useRouter();
    const [judgeId, setJudgeId] = useState<string | null>(null);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [scoredRiderIds, setScoredRiderIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedId = localStorage.getItem('fast_judge_id');
        if (!storedId) {
            router.replace('/judge/login');
            return;
        }
        setJudgeId(storedId);

        const fetchData = async () => {
            const currentJudgeId = localStorage.getItem('fast_judge_id');
            try {
                const [r, s, scores] = await Promise.all([
                    getRiders(),
                    getSettings(),
                    currentJudgeId ? getJudgeScoresByJudge(currentJudgeId) : Promise.resolve([])
                ]);
                setRiders(r);
                setSettings(s);
                // 試技ごとにスコアを管理
                setScoredRiderIds(scores.filter(sc => sc.tryNumber === s.currentTry).map(sc => sc.riderId));
            } catch (error) {
                console.error('Failed to fetch judge main data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Polling fallback (3 seconds) - Same as audience page
        const pollInterval = setInterval(fetchData, 3000);

        // Subscribe to settings changes (Realtime as a bonus)
        const channel = supabase
            .channel('public:contest_settings')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'contest_settings'
            }, (payload) => {
                fetchData();
            })
            .subscribe();

        return () => {
            clearInterval(pollInterval);
            supabase.removeChannel(channel);
        };
    }, [router]);

    const handleLogout = async () => {
        if (!judgeId) return;
        if (!confirm('この番号を解放して戻りますか？\n（他の人がこの番号を選べるようになります）')) return;

        try {
            await releaseJudgeSeat(judgeId);
            localStorage.removeItem('fast_judge_id');
            router.push('/judge/login');
        } catch (error) {
            console.error('Logout error:', error);
            alert('ログアウトに失敗しました');
        }
    };

    const handleRiderSelect = (riderId: string) => {
        if (!judgeId) return;
        router.push(`/judge/score/${riderId}?judgeId=${judgeId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <p className="text-xl animate-pulse">読み込み中...</p>
            </div>
        );
    }

    // 運営が「投票受付中」にしている選手、または全選手を表示（要件により調整）
    // 要件：「運営が「投票受付中」にしている間だけ、現在選択されている選手の入力フォームを表示してください」
    const currentRider = riders.find(r => r.id === settings?.currentRiderId);
    const isVotingOpen = settings?.votingEnabled;
    const currentTry = settings?.currentTry || 1;

    return (
        <div className={`min-h-screen transition-colors duration-700 p-4 md:p-8 pb-24 ${currentTry === 1 ? 'bg-[#0f172a]' : 'bg-[#064e3b]'
            }`}>
            <div className="max-w-md mx-auto">
                <div className="mb-4 flex justify-center">
                    <div className={`px-8 py-2 rounded-full text-xl font-black shadow-2xl border-2 border-white/20 ${currentTry === 1 ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                        {currentTry === 1 ? '1st TRY' : '2nd TRY'}
                    </div>
                </div>

                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--primary)] uppercase tracking-wider">FastJudge</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-sm font-bold text-zinc-500">{judgeId?.toUpperCase()} としてログイン中</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn btn-ghost btn-sm text-zinc-400 hover:text-red-500 font-bold"
                    >
                        この番号を解放して戻る
                    </button>
                </header>

                <main>
                    <section className="mb-12">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="text-xl">🏁</span> 実施中のヒート
                        </h2>

                        {!isVotingOpen ? (
                            <div className="card bg-zinc-50 border-dashed border-2 border-zinc-200 text-center py-12">
                                <p className="text-zinc-400 font-medium">現在、投票は受け付けていません</p>
                                <p className="text-xs text-zinc-400 mt-2">運営の開始指示をお待ちください</p>
                            </div>
                        ) : currentRider ? (
                            <button
                                onClick={() => handleRiderSelect(currentRider.id)}
                                className="w-full text-left p-6 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-white shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm">NOW PERFORMING</span>
                                    <span className="text-2xl">🔥</span>
                                </div>
                                <h3 className="text-3xl font-black mb-1">{currentRider.name}</h3>
                                <p className="text-white/80 font-medium">{currentRider.riderName}</p>

                                <div className="mt-6 pt-6 border-t border-white/20 flex justify-between items-center">
                                    <span className="font-bold">
                                        {scoredRiderIds.includes(currentRider.id) ? '✅ 採点済み（修正する）' : '採点を開始する'}
                                    </span>
                                    <span className="w-8 h-8 rounded-full bg-white text-[var(--primary)] flex items-center justify-center font-bold">→</span>
                                </div>
                            </button>
                        ) : (
                            <div className="card bg-amber-50 border-amber-100 text-amber-700 text-center py-8">
                                <p className="font-bold">選手が選択されていません</p>
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-400">
                            <span className="text-xl">👥</span> 出走リスト
                        </h2>
                        <div className="space-y-3">
                            {riders.map((rider) => (
                                <div
                                    key={rider.id}
                                    className={`p-4 rounded-2xl border bg-white flex items-center justify-between ${rider.id === settings?.currentRiderId ? 'border-[var(--primary)] bg-blue-50/30' : 'border-zinc-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${rider.id === settings?.currentRiderId ? 'bg-[var(--primary)] text-white' : 'bg-zinc-100 text-zinc-400'
                                            }`}>
                                            {rider.displayOrder}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-zinc-800">{rider.name}</h4>
                                            <p className="text-xs text-zinc-400">{rider.riderName}</p>
                                        </div>
                                    </div>
                                    {rider.id === settings?.currentRiderId && isVotingOpen && (
                                        <span className="text-[var(--primary)] text-xs font-black animate-pulse">VOTING NOW</span>
                                    )}
                                    {scoredRiderIds.includes(rider.id) && (
                                        <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200">
                                            投票済み
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
            </div>
        </div>
    );
}
