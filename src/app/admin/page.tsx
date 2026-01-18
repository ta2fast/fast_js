'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RiderResult, ContestSettings, Rider } from '@/types';

export default function AdminPage() {
    const [results, setResults] = useState<RiderResult[]>([]);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [selectingRider, setSelectingRider] = useState(false);

    // localStorageから設定を読み込む
    const loadSettingsFromStorage = useCallback(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('admin_settings');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setSettings(parsed);
                }
            } catch (error) {
                console.error('Failed to load settings from localStorage:', error);
            }
        }
    }, []);

    // 設定をlocalStorageに保存
    const saveSettingsToStorage = useCallback((newSettings: ContestSettings) => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('admin_settings', JSON.stringify(newSettings));
            } catch (error) {
                console.error('Failed to save settings to localStorage:', error);
            }
        }
    }, []);

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
            if (settingsData.success) setSettings(settingsData.data);
            if (ridersData.success) setRiders(ridersData.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // 初期ロード時にlocalStorageから設定を読み込む
        loadSettingsFromStorage();
        fetchData();
        // 3秒ごとに更新
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [fetchData, loadSettingsFromStorage]);

    // settingsが変わったときにlocalStorageに保存
    useEffect(() => {
        if (settings) {
            saveSettingsToStorage(settings);
        }
    }, [settings, saveSettingsToStorage]);

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
            }
        } catch (error) {
            console.error('Failed to toggle voting:', error);
        } finally {
            setToggling(false);
        }
    }

    async function selectCurrentRider(riderId: string | null) {
        console.log('Selecting rider:', riderId);
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
            console.log('API response:', data);
            if (data.success) {
                setSettings(data.data);
            }
        } catch (error) {
            console.error('Failed to select rider:', error);
        } finally {
            setSelectingRider(false);
        }
    }

    function getRankClass(rank: number): string {
        switch (rank) {
            case 1: return 'rank-1';
            case 2: return 'rank-2';
            case 3: return 'rank-3';
            default: return 'rank-other';
        }
    }

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
            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center justify-center mb-4">
                    <h1 className="text-2xl font-bold">⚙️ 運営画面</h1>
                </div>

                {/* Navigation */}
                <nav className="nav justify-center flex-wrap">
                    <Link href="/admin" className="nav-item active">
                        ダッシュボード
                    </Link>
                    <Link href="/admin/riders" className="nav-item">
                        選手管理
                    </Link>
                    <Link href="/admin/settings" className="nav-item">
                        大会設定
                    </Link>
                    <Link href="/admin/logs" className="nav-item">
                        ログ
                    </Link>
                    <Link href="/admin/help" className="nav-item">
                        使い方
                    </Link>
                </nav>
            </header>

            {/* Current Rider Selection */}
            <div className="card mb-8">
                <h2 className="text-xl font-bold mb-4">🎤 現在パフォーマンス中の選手</h2>
                <p className="text-[var(--text-muted)] text-sm mb-4">
                    観客はここで選択された選手にのみ投票できます
                </p>

                {currentRider ? (
                    <div className="flex items-center justify-between p-4 bg-[var(--surface-light)] rounded-xl mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--surface)] flex items-center justify-center">
                                {currentRider.photo && currentRider.photo !== '/images/default-rider.png' ? (
                                    <img
                                        src={currentRider.photo}
                                        alt={currentRider.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl">🚴</span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{currentRider.name}</h3>
                                <p className="text-[var(--text-muted)]">{currentRider.riderName}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => selectCurrentRider(null)}
                            disabled={selectingRider}
                            className="btn btn-ghost"
                        >
                            解除
                        </button>
                    </div>
                ) : (
                    <div className="text-center p-4 bg-[var(--surface-light)] rounded-xl mb-4 text-[var(--text-muted)]">
                        選手が選択されていません
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {riders.map((rider) => (
                        <button
                            key={rider.id}
                            onClick={() => selectCurrentRider(rider.id)}
                            disabled={selectingRider || rider.id === settings?.currentRiderId}
                            className={`p-3 rounded-xl text-left transition-all ${rider.id === settings?.currentRiderId
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--surface)] hover:bg-[var(--surface-light)]'
                                }`}
                        >
                            <div className="font-bold text-sm truncate">{rider.name}</div>
                            <div className="text-xs opacity-70 truncate">{rider.riderName}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Voting Control */}
            <div className="card mb-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold mb-2">投票制御</h2>
                        <p className="text-[var(--text-muted)]">
                            {settings?.votingEnabled
                                ? '現在、観客投票を受け付けています'
                                : '観客投票は停止中です'}
                        </p>
                    </div>
                    <button
                        onClick={toggleVoting}
                        disabled={toggling}
                        className={`btn text-lg py-3 px-8 ${settings?.votingEnabled ? 'btn-danger' : 'btn-accent'
                            }`}
                    >
                        {toggling
                            ? '処理中...'
                            : settings?.votingEnabled
                                ? '投票を停止'
                                : '投票を開始'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card text-center">
                    <p className="text-3xl font-bold text-[var(--primary)]">{results.length}</p>
                    <p className="text-sm text-[var(--text-muted)]">選手数</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-[var(--secondary)]">
                        {results.reduce((sum, r) => sum + r.audienceVotes.length, 0)}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">総投票数</p>
                </div>
                <div className="card text-center">
                    <p className="text-3xl font-bold text-[var(--accent)]">
                        {results.reduce((sum, r) => sum + r.judgeScores.length, 0)}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">採点数</p>
                </div>
                <div className="card text-center">
                    <span className={`badge ${settings?.votingEnabled ? 'badge-accent' : 'badge-danger'}`}>
                        {settings?.votingEnabled ? '投票中' : '停止中'}
                    </span>
                    <p className="text-sm text-[var(--text-muted)] mt-2">投票状態</p>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">🏆 リアルタイム順位</h2>
                    <a
                        href="/api/admin/export?type=results"
                        className="btn btn-ghost text-sm"
                        download
                    >
                        CSVダウンロード
                    </a>
                </div>

                {results.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-8">
                        選手が登録されていません
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>順位</th>
                                    <th>選手</th>
                                    <th className="text-right">ジャッジ点</th>
                                    <th className="text-right">観客点</th>
                                    <th className="text-right">総合点</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result) => (
                                    <tr key={result.riderId} className="animate-fadeIn">
                                        <td>
                                            <span className={`rank ${getRankClass(result.rank)}`}>
                                                {result.rank}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-[var(--text-muted)]">
                                                    {result.rider.riderName}
                                                </span>
                                                <span className="font-bold">{result.rider.name}</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div>
                                                <span className="font-bold">{result.judgeAverage.toFixed(1)}</span>
                                                <span className="text-[var(--text-muted)] text-sm"> /100</span>
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">
                                                ({result.judgeScores.length}件)
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div>
                                                <span className="font-bold">{result.audienceWeightedScore.toFixed(1)}</span>
                                                <span className="text-[var(--text-muted)] text-sm"> /{settings?.audienceMaxScore! * settings?.audienceWeight!}</span>
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">
                                                平均{result.audienceAverage.toFixed(1)} ({result.audienceVotes.length}票)
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <span className="text-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
                                                {result.totalScore.toFixed(1)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
