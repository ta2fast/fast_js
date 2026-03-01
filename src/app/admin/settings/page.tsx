'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ContestSettings, EvaluationItem } from '@/types';
import { calculateMaxJudgeScore } from '@/lib/scoring';
import AdminHeader from '@/components/admin/AdminHeader';
import { getSettings, updateSettings } from '@/lib/store';

export default function SettingsPage() {
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingItem, setEditingItem] = useState<EvaluationItem | null>(null);
    const [showItemModal, setShowItemModal] = useState(false);
    const router = useRouter();

    const fetchSettings = useCallback(async () => {
        try {
            const data = await getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    async function saveSettings(updates: Partial<ContestSettings>) {
        if (!settings) return;
        setSaving(true);
        try {
            const updated = await updateSettings(updates);
            setSettings(updated);
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('設定の保存に失敗しました');
        } finally {
            setSaving(false);
        }
    }

    function handleItemEdit(item: EvaluationItem) {
        setEditingItem({ ...item });
        setShowItemModal(true);
    }

    function handleItemAdd() {
        const newItem: EvaluationItem = {
            id: `item_${Date.now()}`,
            name: '新しい項目',
            weight: 1,
            minScore: 1,
            maxScore: 5,
            order: (settings?.evaluationItems.length || 0) + 1,
            enabled: true,
        };
        setEditingItem(newItem);
        setShowItemModal(true);
    }

    function handleItemSave() {
        if (!editingItem || !settings) return;

        const existingIndex = settings.evaluationItems.findIndex(i => i.id === editingItem.id);
        let newItems: EvaluationItem[];

        if (existingIndex >= 0) {
            newItems = [...settings.evaluationItems];
            newItems[existingIndex] = editingItem;
        } else {
            newItems = [...settings.evaluationItems, editingItem];
        }

        saveSettings({ evaluationItems: newItems });
        setShowItemModal(false);
        setEditingItem(null);
    }

    function handleItemDelete(itemId: string) {
        if (!settings) return;
        if (!confirm('この評価項目を削除しますか？')) return;

        const newItems = settings.evaluationItems.filter(i => i.id !== itemId);
        saveSettings({ evaluationItems: newItems });
    }

    function toggleItemEnabled(itemId: string) {
        if (!settings) return;

        const newItems = settings.evaluationItems.map(item =>
            item.id === itemId ? { ...item, enabled: !item.enabled } : item
        );
        saveSettings({ evaluationItems: newItems });
    }

    // 現在の最大ジャッジ点を計算
    const maxJudgeScore = settings
        ? calculateMaxJudgeScore(settings.evaluationItems)
        : 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-[var(--text-muted)]">読み込み中...</div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-[var(--danger)]">設定の取得に失敗しました</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <AdminHeader />

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Contest Info */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">📅 大会情報</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-[var(--text-muted)] mb-2">
                                大会名
                            </label>
                            <input
                                type="text"
                                value={settings.contestName}
                                onChange={e => saveSettings({ contestName: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-muted)] mb-2">
                                開催日
                            </label>
                            <input
                                type="date"
                                value={settings.contestDate}
                                onChange={e => saveSettings({ contestDate: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-muted)] mb-2">
                                審査員数 (1〜10)
                            </label>
                            <select
                                value={settings.judgeCount || 3}
                                onChange={e => saveSettings({ judgeCount: parseInt(e.target.value) })}
                                className="input"
                            >
                                {[...Array(10)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}名</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">※ジャッジログイン画面のボタン数に反映されます</p>
                        </div>
                    </div>
                </div>

                {/* Audience Settings */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">🎉 観客投票設定</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-[var(--text-muted)] mb-2">
                                観客点ウエイト（×{settings.audienceWeight} = 最大{settings.audienceMaxScore * settings.audienceWeight}点）
                            </label>
                            <select
                                value={settings.audienceWeight}
                                onChange={e => saveSettings({ audienceWeight: parseInt(e.target.value) })}
                                className="input"
                            >
                                {[...Array(10)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1}倍</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    最小点
                                </label>
                                <select
                                    value={settings.audienceMinScore}
                                    onChange={e => saveSettings({ audienceMinScore: parseInt(e.target.value) })}
                                    className="input"
                                >
                                    {[...Array(10)].map((_, i) => (
                                        <option key={i} value={i}>{i}点</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    最大点
                                </label>
                                <select
                                    value={settings.audienceMaxScore}
                                    onChange={e => saveSettings({ audienceMaxScore: parseInt(e.target.value) })}
                                    className="input"
                                >
                                    {[...Array(20)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}点</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-muted)] mb-2">
                                投票締切秒数
                            </label>
                            <select
                                value={settings.votingDeadlineSeconds}
                                onChange={e => saveSettings({ votingDeadlineSeconds: parseInt(e.target.value) })}
                                className="input"
                            >
                                {[10, 20, 30, 45, 60, 90, 120, 180, 240, 300].map(sec => (
                                    <option key={sec} value={sec}>{sec}秒</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="allowModification"
                                checked={settings.allowVoteModification}
                                onChange={e => saveSettings({ allowVoteModification: e.target.checked })}
                                className="w-5 h-5"
                            />
                            <label htmlFor="allowModification" className="text-sm">
                                投票後の変更を許可（{settings.modificationWindowSeconds}秒以内）
                            </label>
                        </div>
                    </div>
                </div>



                {/* Evaluation Items */}
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold">📋 評価項目</h2>
                            <p className="text-sm text-[var(--text-muted)]">
                                現在の最大ジャッジ点: {maxJudgeScore}点
                            </p>
                        </div>
                        <button onClick={handleItemAdd} className="btn btn-primary">
                            + 項目を追加
                        </button>
                    </div>

                    <div className="space-y-3">
                        {settings.evaluationItems
                            .sort((a, b) => a.order - b.order)
                            .map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${item.enabled
                                        ? 'bg-[var(--surface-light)]'
                                        : 'bg-[var(--surface)] opacity-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-[var(--text-muted)] text-sm w-6">
                                            #{index + 1}
                                        </span>
                                        <div>
                                            <h3 className="font-bold">{item.name}</h3>
                                            <p className="text-sm text-[var(--text-muted)]">
                                                ウエイト: ×{item.weight} | 点数: {item.minScore}〜{item.maxScore}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleItemEnabled(item.id)}
                                            className={`btn text-sm ${item.enabled ? 'btn-accent' : 'btn-ghost'}`}
                                        >
                                            {item.enabled ? '有効' : '無効'}
                                        </button>
                                        <button
                                            onClick={() => handleItemEdit(item)}
                                            className="btn btn-ghost text-sm"
                                        >
                                            編集
                                        </button>
                                        <button
                                            onClick={() => handleItemDelete(item.id)}
                                            className="btn btn-danger text-sm"
                                        >
                                            削除
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Item Edit Modal */}
            {showItemModal && editingItem && (
                <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-6">評価項目を編集</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    項目名
                                </label>
                                <input
                                    type="text"
                                    value={editingItem.name}
                                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    ウエイト
                                </label>
                                <select
                                    value={editingItem.weight}
                                    onChange={e => setEditingItem({ ...editingItem, weight: parseInt(e.target.value) })}
                                    className="input"
                                >
                                    {[...Array(10)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}倍</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                                        最小点
                                    </label>
                                    <select
                                        value={editingItem.minScore}
                                        onChange={e => setEditingItem({ ...editingItem, minScore: parseInt(e.target.value) })}
                                        className="input"
                                    >
                                        {[...Array(10)].map((_, i) => (
                                            <option key={i} value={i}>{i}点</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-2">
                                        最大点
                                    </label>
                                    <select
                                        value={editingItem.maxScore}
                                        onChange={e => setEditingItem({ ...editingItem, maxScore: parseInt(e.target.value) })}
                                        className="input"
                                    >
                                        {[...Array(20)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1}点</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    表示順
                                </label>
                                <select
                                    value={editingItem.order}
                                    onChange={e => setEditingItem({ ...editingItem, order: parseInt(e.target.value) })}
                                    className="input"
                                >
                                    {[...Array(Math.max(editingItem.order, settings.evaluationItems.length + 1))].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowItemModal(false)}
                                className="btn btn-ghost flex-1"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleItemSave}
                                disabled={saving}
                                className="btn btn-primary flex-1"
                            >
                                {saving ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Danger Zone */}
            <div className="mt-12 p-6 border-2 border-red-500/20 rounded-2xl bg-red-500/5">
                <h2 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
                    ⚠️ 危険な操作 (Danger Zone)
                </h2>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <p className="font-bold text-red-700 dark:text-red-400">大会データの初期化</p>
                        <p className="text-sm text-[var(--text-muted)]">
                            すべてのジャッジ点、観客投票、およびログを削除します。この操作は取り消せません。
                        </p>
                    </div>
                    <button
                        onClick={async () => {
                            if (!confirm('【警告】すべての大会データを削除します。本当によろしいですか？')) return;
                            if (!confirm('最終確認：この操作は絶対に取り消せません。データをリセットしますか？')) return;

                            setSaving(true);
                            try {
                                const res = await fetch('/api/admin/reset', { method: 'POST' });
                                const data = await res.json();
                                if (data.success) {
                                    alert('初期化が完了しました');
                                    router.push('/admin');
                                } else {
                                    alert(`初期化に失敗しました: ${data.error}`);
                                }
                            } catch (error) {
                                console.error('Reset failed:', error);
                                alert('エラーが発生しました');
                            } finally {
                                setSaving(false);
                            }
                        }}
                        disabled={saving}
                        className="btn btn-danger py-3 px-8 shadow-lg active:scale-95"
                    >
                        {saving ? '処理中...' : '大会を初期化する'}
                    </button>
                </div>

                {/* Judge Session Reset */}
                <div className="mt-8 pt-8 border-t border-red-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <p className="font-bold">ジャッジログイン状況のリセット</p>
                        <p className="text-sm text-[var(--text-muted)]">
                            すべてのジャッジのログイン状態（座席占有）を強制解除します。<br />
                            「座席が埋まっていてログインできない」と言われた場合に使用してください。
                        </p>
                    </div>
                    <button
                        onClick={async () => {
                            if (!confirm('すべてのジャッジログイン状況をリセットしてよろしいですか？')) return;

                            setSaving(true);
                            try {
                                const { resetAllJudgeSessions } = await import('@/lib/store');
                                const success = await resetAllJudgeSessions();
                                if (success) {
                                    alert('ジャッジセッションのリセットが完了しました');
                                }
                            } catch (error: any) {
                                console.error('Session reset failed:', error);
                                const message = error?.message || '不明なエラー';
                                alert(`リセットに失敗しました: ${message}`);
                            } finally {
                                setSaving(false);
                            }
                        }}
                        disabled={saving}
                        className="btn btn-primary bg-red-600 hover:bg-red-700 border-none py-3 px-8 shadow-lg active:scale-95"
                    >
                        {saving ? '処理中...' : 'ジャッジログイン状況を全リセット'}
                    </button>
                </div>
            </div>
        </div>
    );
}
