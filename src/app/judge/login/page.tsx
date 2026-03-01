'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { JudgeSession } from '@/types';
import { getJudgeSessions, occupyJudgeSeat, getSettings } from '@/lib/store';

export default function JudgeLoginPage() {
    const router = useRouter();
    const [judgeCount, setJudgeCount] = useState(3);
    const [sessions, setSessions] = useState<JudgeSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        // Initial fetch
        const init = async () => {
            try {
                const settings = await getSettings();
                setJudgeCount(settings.judgeCount || 3);

                const sess = await getJudgeSessions();
                setSessions(sess);
            } catch (error) {
                console.error('Failed to initialize judge login:', error);
            } finally {
                setLoading(false);
            }
        };

        init();

        // Subscribe to real-time updates for judge_sessions
        const channel = supabase
            .channel('public:judge_sessions')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'judge_sessions'
            }, (payload) => {
                const updatedSession = payload.new as any;
                setSessions(curr =>
                    curr.map(s => s.judgeId === updatedSession.judge_id
                        ? { judgeId: updatedSession.judge_id, isOccupied: updatedSession.is_occupied, updatedAt: updatedSession.updated_at }
                        : s
                    )
                );
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleSelectJudge = async (judgeId: string) => {
        const session = sessions.find(s => s.judgeId === judgeId);
        const storedId = localStorage.getItem('fast_judge_id');

        // 同一端末（LocalStorage）の再入室は許可
        const isSelf = storedId === judgeId;

        if (session?.isOccupied && !isSelf) {
            alert('この番号はすでに他の端末で使用されています。すでに使用中の場合は、運営にリセットを依頼してください。');
            return;
        }

        setProcessing(true);
        try {
            const success = await occupyJudgeSeat(judgeId);
            if (success) {
                localStorage.setItem('fast_judge_id', judgeId);
                router.push('/judge/main');
            } else {
                alert('この番号はすでに選択されているか、エラーが発生しました。');
            }
        } catch (error) {
            console.error('Selection error:', error);
            alert('選択に失敗しました。');
        } finally {
            setProcessing(false);
        }
    };

    // 審査員数分だけボタンを生成
    const judgeButtons = Array.from({ length: judgeCount }, (_, i) => {
        const id = `judge${i + 1}`;
        const name = `ジャッジ${i + 1}`;
        const session = sessions.find(s => s.judgeId === id);
        const isOccupied = session?.isOccupied || false;

        return (
            <button
                key={id}
                onClick={() => handleSelectJudge(id)}
                disabled={isOccupied || processing}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl transition-all h-40 border-2 ${isOccupied
                    ? 'bg-zinc-100 border-zinc-200 opacity-50 cursor-not-allowed text-zinc-400'
                    : 'bg-white border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white text-[var(--primary)] shadow-lg active:scale-95'
                    }`}
            >
                <span className="text-4xl mb-2">👤</span>
                <span className="text-xl font-bold">{name}</span>
                {isOccupied && <span className="text-xs mt-2 font-medium">使用中</span>}
            </button>
        );
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <p className="text-xl animate-pulse">読み込み中...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent mb-4">
                        ジャッジログイン
                    </h1>
                    <p className="text-[var(--text-muted)]">
                        担当するジャッジ番号を選択してください
                    </p>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {judgeButtons}
                </div>

                <div className="mt-12 text-center text-sm text-[var(--text-muted)]">
                    <p>※ 一度選択すると、その端末は特定のジャッジとして固定されます</p>
                </div>
            </div>
        </div>
    );
}
