'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RiderResult, ContestSettings, Rider } from '@/types';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminPage() {
    const [results, setResults] = useState<RiderResult[]>([]);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [selectingRider, setSelectingRider] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [scoresRes, settingsRes, ridersRes] = await Promise.all([
                fetch('/api/scores'),
                fetch('/api/admin/settings'),
                fetch('/api/riders'),
            ]);

            const scoresData = await scoresRes.json();
            const settingsData = await settingsRes.json();
            const ridersData = await ridersRes.json();

            if (scoresData.success) setResults(scoresData.data);
            if (settingsData.success) {
                setSettings(settingsData.data);
            }
            if (ridersData.success) setRiders(ridersData.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [fetchData]);

    async function toggleVoting() {
        if (!settings || toggling) return;

        setToggling(true);
        try {
            const res = await fetch('/api/admin/voting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: !settings.votingEnabled,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSettings(data.data);
            } else {
                alert(`保存に失敗しました: ${data.error}`);
            }
        } catch (error) {
            console.error('Failed to toggle voting:', error);
            alert('通信エラーが発生しました');
        } finally {
            setToggling(false);
        }
    }

    async function selectCurrentRider(riderId: string | null) {
        setSelectingRider(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentRiderId: riderId,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSettings(data.data);
            } else {
                alert(`選手選択に失敗しました: ${data.error}`);
            }
        } catch (error) {
            console.error('Failed to select rider:', error);
            alert('通信エラーが発生しました');
        } finally {
            setSelectingRider(false);
        }
    }

    const getRankClass = (rank: number) => {
        switch (rank) {
            case 1: return 'rank-1';
            case 2: return 'rank-2';
            case 3: return 'rank-3';
            default: return 'rank-other';
        }
    };

    const currentRider = riders.find(r => r.id === settings?.currentRiderId);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-[var(--text-muted)]">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <AdminHeader />

            {/* Current Rider & Voting Control Card (Integrated) */}
            <div className="card mb-8 border-l-4 border-[var(--primary)]">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        🎤 パフォーマンス進行管理
                        {settings?.votingEnabled && (
                            <span className="badge badge-accent animate-pulse">投票受付中</span>
                        )}
                    </h2>
                    <Link
                        href="/admin/results-control"
                        className="btn btn-primary btn-sm flex items-center gap-2 h-10 px-6 shadow-lg hover:scale-105 transition-transform"
                    >
                        📊 リザルト演出設定
                    </Link>
                </div>

                <div className="bg-[var(--surface-light)] rounded-2xl p-6 mb-8 shadow-inner">
                    {currentRider ? (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center shadow-lg text-white font-black">
                                    <span className="text-4xl">{currentRider.displayOrder}</span>
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-muted)] mb-1">現在の選手</p>
                                    <h3 className="font-bold text-2xl">{currentRider.riderName}</h3>
                                    <p className="text-sm opacity-70">{currentRider.name}</p>
                                </div>
                            </div>

                            <div className="flex gap-4 w-full md:w-auto">
                                <button
                                    onClick={toggleVoting}
                                    disabled={toggling}
                                    className={`btn flex-1 md:flex-none text-lg py-4 px-10 shadow-lg transition-all active:scale-95 ${settings?.votingEnabled ? 'btn-danger' : 'btn-accent'
                                        }`}
                                >
                                    {toggling ? '...' : (settings?.votingEnabled ? '🛑 投票を終了' : '🚀 投票を開始')}
                                </button>
                                <button
                                    onClick={() => selectCurrentRider(null)}
                                    disabled={selectingRider || settings?.votingEnabled}
                                    className="btn btn-ghost"
                                    title="選手選択を解除"
                                >
                                    解除
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            <p className="text-lg">選手が選択されていません</p>
                            <p className="text-sm">下のリストから選手を選択してください</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {riders.map((rider) => (
                        <button
                            key={rider.id}
                            onClick={() => selectCurrentRider(rider.id)}
                            disabled={selectingRider || rider.id === settings?.currentRiderId || settings?.votingEnabled}
                            className={`p-4 rounded-xl text-left transition-all border-2 ${rider.id === settings?.currentRiderId
                                ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-md'
                                : 'bg-[var(--surface)] border-transparent hover:border-[var(--surface-border)] hover:bg-[var(--surface-light)]'
                                } ${settings?.votingEnabled && rider.id !== settings?.currentRiderId ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-bold">
                                    {rider.displayOrder}
                                </span>
                                <div className="font-bold text-sm truncate">{rider.riderName}</div>
                            </div>
                            <div className="text-xs opacity-70 truncate ml-7">{rider.name}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card text-center p-6">
                    <p className="text-4xl font-black text-[var(--primary)]">{results.length}</p>
                    <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Players</p>
                </div>
                <div className="card text-center p-6">
                    <p className="text-4xl font-black text-[var(--secondary)]">
                        {results.reduce((sum, r) => sum + r.audienceVotes.length, 0)}
                    </p>
                    <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Audience Votes</p>
                </div>
                <div className="card text-center p-6">
                    <p className="text-4xl font-black text-[var(--accent)]">
                        {results.reduce((sum, r) => sum + r.judgeScores.length, 0)}
                    </p>
                    <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Judge Scores</p>
                </div>
                <div className="card text-center p-6">
                    <div className="flex flex-col items-center justify-center h-full">
                        <span className={`badge mb-2 ${settings?.votingEnabled ? 'badge-accent' : 'badge-danger'}`}>
                            {settings?.votingEnabled ? 'LIVE' : 'IDLE'}
                        </span>
                        <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Status</p>
                    </div>
                </div>
            </div>

            {/* Ranking Table */}
            <div className="card shadow-xl overflow-hidden">
                <div className="flex items-center justify-between p-6 bg-[var(--surface-light)] border-b border-[var(--surface-border)]">
                    <h2 className="text-xl font-bold flex items-center gap-2">🏆 大会ランキング</h2>
                    <a href="/api/admin/export?type=results" className="btn btn-ghost btn-sm" download>CSV Export</a>
                </div>

                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-[var(--surface)]">
                            <tr>
                                <th className="p-4 text-left">Rank</th>
                                <th className="p-4 text-left">Rider</th>
                                <th className="p-4 text-right">Judge Avg.</th>
                                <th className="p-4 text-right">Audience Avg.</th>
                                <th className="p-4 text-right">Total Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((result) => (
                                <tr key={result.riderId} className="border-b border-[var(--surface-border)] hover:bg-[var(--surface-light)] transition-colors">
                                    <td className="p-4"><span className={`rank ${getRankClass(result.rank)}`}>{result.rank}</span></td>
                                    <td className="p-4">
                                        <div className="font-bold">{result.rider.riderName}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{result.rider.name}</div>
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold">{result.judgeAverage.toFixed(1)}</td>
                                    <td className="p-4 text-right font-mono text-[var(--secondary)] font-bold">{result.audienceAverage.toFixed(1)}</td>
                                    <td className="p-4 text-right">
                                        <span className="text-xl font-black text-[var(--primary)]">{result.totalScore.toFixed(1)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
