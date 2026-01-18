'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Rider } from '@/types';

export default function RidersManagementPage() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRider, setEditingRider] = useState<Rider | null>(null);
    const [formData, setFormData] = useState({ name: '', riderName: '', photo: '' });
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const fetchRiders = useCallback(async () => {
        try {
            const res = await fetch('/api/riders');
            const data = await res.json();
            if (data.success) setRiders(data.data);
        } catch (error) {
            console.error('Failed to fetch riders:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRiders();
    }, [fetchRiders]);

    function openAddModal() {
        setEditingRider(null);
        setFormData({ name: '', riderName: '', photo: '' });
        setShowModal(true);
    }

    function openEditModal(rider: Rider) {
        setEditingRider(rider);
        setFormData({
            name: rider.name,
            riderName: rider.riderName || '',
            photo: rider.photo || ''
        });
        setShowModal(true);
    }

    async function handleSave() {
        if (!formData.name || !formData.riderName) {
            alert('名前とライダーネームは必須です');
            return;
        }

        setSaving(true);
        try {
            const method = editingRider ? 'PUT' : 'POST';
            const body = editingRider
                ? { id: editingRider.id, ...formData }
                : { ...formData };

            const res = await fetch('/api/riders', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                fetchRiders();
            } else {
                alert(data.error || '保存に失敗しました');
            }
        } catch (error) {
            console.error('Failed to save rider:', error);
            alert('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(rider: Rider) {
        if (!confirm(`${rider.name} を削除しますか？`)) return;

        try {
            const res = await fetch(`/api/riders?id=${rider.id}`, {
                method: 'DELETE',
            });

            const data = await res.json();
            if (data.success) {
                fetchRiders();
            } else {
                alert(data.error || '削除に失敗しました');
            }
        } catch (error) {
            console.error('Failed to delete rider:', error);
            alert('削除に失敗しました');
        }
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
                    <Link href="/admin/riders" className="nav-item active">
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

            {/* Content */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">👤 選手管理</h2>
                    <button onClick={openAddModal} className="btn btn-primary">
                        + 選手を追加
                    </button>
                </div>

                {riders.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-8">
                        選手が登録されていません
                    </div>
                ) : (
                    <div className="space-y-3">
                        {riders.map((rider, index) => (
                            <div
                                key={rider.id}
                                className="flex items-center justify-between p-4 bg-[var(--surface-light)] rounded-xl animate-slideIn"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="rider-photo w-14 h-14 flex items-center justify-center text-xl">
                                        {rider.photo && rider.photo !== '/images/default-rider.png' ? (
                                            <img
                                                src={rider.photo}
                                                alt={rider.name}
                                                className="w-full h-full object-cover rounded-xl"
                                            />
                                        ) : (
                                            '🏍️'
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{rider.name}</h3>
                                        <span className="text-sm text-[var(--text-muted)]">
                                            {rider.riderName}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(rider)}
                                        className="btn btn-ghost text-sm"
                                    >
                                        編集
                                    </button>
                                    <button
                                        onClick={() => handleDelete(rider)}
                                        className="btn btn-danger text-sm"
                                    >
                                        削除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-6">
                            {editingRider ? '選手を編集' : '選手を追加'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    名前 *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="input"
                                    placeholder="山田 太郎"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    ライダーネーム *
                                </label>
                                <input
                                    type="text"
                                    value={formData.riderName}
                                    onChange={e => setFormData(prev => ({ ...prev, riderName: e.target.value }))}
                                    className="input"
                                    placeholder="TARO"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-2">
                                    写真URL（任意）
                                </label>
                                <input
                                    type="text"
                                    value={formData.photo}
                                    onChange={e => setFormData(prev => ({ ...prev, photo: e.target.value }))}
                                    className="input"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="btn btn-ghost flex-1"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn btn-primary flex-1"
                            >
                                {saving ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
