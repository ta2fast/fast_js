'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogEntry } from '@/types';

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const router = useRouter();

    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/logs');
            const data = await res.json();
            if (data.success) setLogs(data.data);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
        // 10秒ごとに更新
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, [fetchLogs]);

    const filteredLogs = filter === 'all'
        ? logs
        : logs.filter(log => log.type === filter);

    function getTypeLabel(type: string): { label: string; class: string } {
        switch (type) {
            case 'judge_score':
                return { label: 'ジャッジ採点', class: 'badge-primary' };
            case 'audience_vote':
                return { label: '観客投票', class: 'badge-secondary' };
            case 'setting_change':
                return { label: '設定変更', class: 'badge-accent' };
            case 'voting_control':
                return { label: '投票制御', class: 'badge-danger' };
            default:
                return { label: type, class: '' };
        }
    }

    function formatTime(timestamp: string): string {
        const date = new Date(timestamp);
        return date.toLocaleString('ja-JP', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

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
                    <Link href="/admin" className="nav-item">
                        ダッシュボード
                    </Link>
                    <Link href="/admin/riders" className="nav-item">
                        選手管理
                    </Link>
                    <Link href="/admin/settings" className="nav-item">
                        大会設定
                    </Link>
                    <Link href="/admin/logs" className="nav-item active">
                        ログ
                    </Link>
                    <Link href="/admin/help" className="nav-item">
                        使い方
                    </Link>
                </nav>
            </header>

            {/* Content */}
            <div className="card">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold">📜 操作ログ</h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`btn text-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            すべて
                        </button>
                        <button
                            onClick={() => setFilter('judge_score')}
                            className={`btn text-sm ${filter === 'judge_score' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            ジャッジ採点
                        </button>
                        <button
                            onClick={() => setFilter('audience_vote')}
                            className={`btn text-sm ${filter === 'audience_vote' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            観客投票
                        </button>
                        <button
                            onClick={() => setFilter('setting_change')}
                            className={`btn text-sm ${filter === 'setting_change' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            設定変更
                        </button>
                        <button
                            onClick={() => setFilter('voting_control')}
                            className={`btn text-sm ${filter === 'voting_control' ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            投票制御
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 mb-4">
                    <a
                        href="/api/admin/export?type=all"
                        className="btn btn-accent text-sm"
                        download
                    >
                        全データをCSVダウンロード
                    </a>
                    <a
                        href="/api/admin/export?type=audience_votes"
                        className="btn btn-ghost text-sm"
                        download
                    >
                        投票データ
                    </a>
                    <a
                        href="/api/admin/export?type=judge_scores"
                        className="btn btn-ghost text-sm"
                        download
                    >
                        採点データ
                    </a>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-8">
                        ログがありません
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {filteredLogs.map((log, index) => {
                            const typeInfo = getTypeLabel(log.type);
                            return (
                                <div
                                    key={log.id}
                                    className="flex items-start gap-4 p-3 bg-[var(--surface-light)] rounded-lg animate-fadeIn text-sm"
                                    style={{ animationDelay: `${index * 0.02}s` }}
                                >
                                    <span className="text-[var(--text-muted)] whitespace-nowrap">
                                        {formatTime(log.timestamp)}
                                    </span>
                                    <span className={`badge ${typeInfo.class} whitespace-nowrap`}>
                                        {typeInfo.label}
                                    </span>
                                    <span className="flex-1">{log.action}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
