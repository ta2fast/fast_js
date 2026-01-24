'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Rider, ContestSettings } from '@/types';
import { generateDeviceId, recordVote, getVoteRecord } from '@/lib/deviceId';

enum ViewStage {
    WAITING = 'WAITING',
    READY = 'READY',
    VOTING = 'VOTING',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR'
}

export default function AudiencePage() {
    // ---- States ----
    const [stage, setStage] = useState<ViewStage>(ViewStage.WAITING);
    const [currentRider, setCurrentRider] = useState<Rider | null>(null);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [deviceId, setDeviceId] = useState<string>('');
    const [votedScore, setVotedScore] = useState<number | null>(null);
    const [selectedScore, setSelectedScore] = useState<number>(0);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<string>('Never');

    const isMounted = useRef(true);
    const prevRiderId = useRef<string | null>(null);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    // ---- Robust Synchronization ----
    const sync = useCallback(async () => {
        try {
            const [settingsRes, ridersRes] = await Promise.all([
                fetch('/api/admin/settings', { cache: 'no-store' }),
                fetch('/api/riders', { cache: 'no-store' })
            ]);

            const settingsData = await settingsRes.json();
            const ridersData = await ridersRes.json();

            if (!isMounted.current) return;

            if (settingsData.success && ridersData.success) {
                const newSettings = settingsData.data as ContestSettings;
                const activeRiderId = newSettings.currentRiderId;
                const riderInfo = activeRiderId
                    ? ridersData.data.find((r: Rider) => r.id === activeRiderId) || null
                    : null;

                setSettings(newSettings);
                setCurrentRider(riderInfo);
                setLastSync(new Date().toLocaleTimeString());

                // Logic: Determine Stage
                if (!newSettings.votingEnabled || !riderInfo) {
                    setStage(ViewStage.WAITING);
                    prevRiderId.current = null;
                } else {
                    // Check for rider transition or first load
                    if (prevRiderId.current !== riderInfo.id) {
                        const record = getVoteRecord(riderInfo.id);
                        if (record) {
                            setStage(ViewStage.COMPLETED);
                            setVotedScore(record.score);
                        } else {
                            setStage(ViewStage.READY);
                            setVotedScore(null);
                            setSelectedScore(0);
                        }
                        prevRiderId.current = riderInfo.id;
                    } else {
                        // Rider is the same. Just check if a vote record appeared (maybe from another tab)
                        const record = getVoteRecord(riderInfo.id);
                        if (record && stage !== ViewStage.VOTING) {
                            setStage(ViewStage.COMPLETED);
                            setVotedScore(record.score);
                        }
                    }
                }
            } else {
                throw new Error('API Success false');
            }
        } catch (err) {
            console.error('Sync failed:', err);
            // Don't change stage to ERROR on transient polling errors to avoid flashing
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [stage]);

    // Polling setup with safety
    useEffect(() => {
        let timer: NodeJS.Timeout;

        async function runSync() {
            await sync();
            if (isMounted.current) {
                timer = setTimeout(runSync, 3000);
            }
        }

        async function init() {
            const id = await generateDeviceId();
            if (isMounted.current) setDeviceId(id);
            runSync();
        }

        init();
        return () => clearTimeout(timer);
    }, [sync]);

    // ---- Handlers ----
    const handleStartVoting = () => setStage(ViewStage.VOTING);

    const handleSubmit = useCallback(async () => {
        if (!selectedScore || submitting || !currentRider || !deviceId) return;

        setSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await fetch('/api/audience/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    riderId: currentRider.id,
                    score: selectedScore,
                    deviceId,
                }),
            });

            const data = await res.json();
            if (!isMounted.current) return;

            if (data.success) {
                recordVote(currentRider.id, selectedScore);
                setStage(ViewStage.COMPLETED);
                setVotedScore(selectedScore);
            } else {
                setErrorMsg(data.error || '投票に失敗しました');
            }
        } catch (err) {
            console.error('Submit error:', err);
            if (isMounted.current) setErrorMsg('通信エラーが発生しました');
        } finally {
            if (isMounted.current) setSubmitting(false);
        }
    }, [selectedScore, submitting, currentRider, deviceId]);

    const resetVotes = () => {
        if (confirm('ローカルの投票記録をリセットしますか？\n(テスト中に「投票完了」画面から動かない場合に有効です)')) {
            localStorage.removeItem('bmx_votes');
            window.location.reload();
        }
    };

    // ---- UI Parts ----
    const Header = () => (
        <header className="flex justify-between items-center mb-10 w-full max-w-md">
            <h1 className="text-xl font-black tracking-tighter">FastJudge</h1>
            <button
                type="button"
                onClick={() => window.location.reload()}
                className="p-2 opacity-30 hover:opacity-100 transition-opacity"
            >
                🔄
            </button>
        </header>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-sm text-[var(--text-muted)] animate-pulse font-mono tracking-widest">SYNCING...</div>
            </div>
        );
    }

    let view;
    switch (stage) {
        case ViewStage.WAITING:
            view = (
                <div className="card p-10 text-center max-w-md w-full animate-fadeIn shadow-2xl bg-[var(--surface)] border-[var(--surface-border)]">
                    <h1 className="text-2xl font-black mb-6">準備中</h1>
                    <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                        運営が投票を開始するまで<br />そのままお待ちください。
                    </p>
                    <div className="mt-12 flex justify-center gap-1 opacity-20">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                </div>
            );
            break;
        case ViewStage.READY:
            view = (
                <div className="card p-10 text-center max-w-md w-full animate-fadeIn shadow-2xl border-t-4 border-[var(--primary)] bg-[var(--surface)]">
                    <div className="mb-10 text-emerald-400 text-[10px] font-bold tracking-[0.3em] uppercase">Voting Active</div>
                    <h1 className="text-4xl font-black text-white mb-10">観客投票</h1>
                    <div className="mb-12 py-8 border-y border-white/5">
                        <h2 className="text-3xl font-black text-[var(--secondary)]">{currentRider?.riderName}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleStartVoting}
                        className="btn btn-secondary w-full text-xl py-6 shadow-xl active:scale-95 font-black"
                    >
                        投票する →
                    </button>
                </div>
            );
            break;
        case ViewStage.VOTING:
            view = (
                <div className="w-full max-w-md flex flex-col animate-fadeIn">
                    <div className="card mb-8 p-8 text-center shadow-lg border-t-4 border-[var(--primary)] bg-[var(--surface)]">
                        <h2 className="text-3xl font-black text-white mb-1">{currentRider?.riderName}</h2>
                        <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em] uppercase opacity-50">Score Sheet</p>
                    </div>
                    <div className="card flex-1 flex flex-col items-center justify-center p-8 mb-8 bg-[var(--surface)] shadow-xl relative">
                        <button type="button" onClick={() => setStage(ViewStage.READY)} className="absolute top-6 left-6 text-[10px] text-[var(--text-muted)] uppercase tracking-widest"> ← Back </button>
                        <p className="text-lg mb-10 text-[var(--foreground)] font-bold">評価を選択</p>
                        <div className="flex justify-center gap-1 mb-12 w-full">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setSelectedScore(star)}
                                    className={`text-5xl transition-all ${star <= selectedScore ? 'text-[var(--secondary)] scale-110 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-gray-800'}`}
                                > ★ </button>
                            ))}
                        </div>
                        <div className="h-10">
                            {selectedScore > 0 && <p className="text-5xl font-black text-[var(--secondary)] animate-scaleIn">{selectedScore} <span className="text-xl">点</span></p>}
                        </div>
                        {errorMsg && <p className="mt-8 text-[var(--danger)] text-sm font-bold">{errorMsg}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={selectedScore === 0 || submitting}
                        className="btn btn-secondary w-full text-2xl py-6 rounded-2xl shadow-2xl transition-all active:scale-95 font-black"
                    >
                        {submitting ? '送信中...' : '確定する'}
                    </button>
                </div>
            );
            break;
        case ViewStage.COMPLETED:
            view = (
                <div className="card p-10 text-center max-w-md w-full animate-fadeIn shadow-2xl border-t-4 border-[var(--accent)] bg-[var(--surface)]">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                        <span className="text-4xl text-emerald-400 font-bold">✓</span>
                    </div>
                    <h2 className="text-3xl font-black mb-6 text-white">投票完了</h2>
                    <p className="text-[var(--secondary)] font-black text-2xl mb-10">{currentRider?.riderName}</p>
                    <div className="flex justify-center gap-1 mb-12">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-3xl ${star <= (votedScore || 0) ? 'text-[var(--secondary)]' : 'text-gray-800'}`}>★</span>
                        ))}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] animate-pulse tracking-[0.5em] font-bold uppercase">Stand by for next</p>
                </div>
            );
            break;
    }

    return (
        <div className="min-h-screen flex flex-col p-6 items-center justify-center bg-[var(--background)]">
            <Header />
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
                {view}
            </div>

            {/* Diagnostic Footer */}
            <div className="mt-auto w-full max-w-md pt-8">
                <div className="bg-black/20 rounded-xl p-3 border border-white/5 font-mono text-[9px] space-y-1">
                    <div className="flex justify-between items-center opacity-40">
                        <span>STAGE: {stage}</span>
                        <span>SYNC: {lastSync}</span>
                    </div>
                    <div className="flex justify-between items-center opacity-20">
                        <span>ID: {currentRider?.id?.slice(0, 6) || 'None'}</span>
                        <span>VOTING: {settings?.votingEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                    <button
                        onClick={resetVotes}
                        className="w-full mt-2 py-1 bg-red-900/10 hover:bg-red-900/30 text-red-500/50 hover:text-red-500 border border-red-500/10 rounded transition-all"
                    >
                        DEBUG: 投票記録のリセット
                    </button>
                </div>
                <p className="text-center text-[8px] text-[var(--text-muted)] mt-4 tracking-[0.5em] uppercase opacity-20">FastJudge System</p>
            </div>
        </div>
    );
}
