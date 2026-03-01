'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Define the interface based on the SQL schema
interface AnimationSettings {
    id: number;
    label_display_time: number;
    bar_transition_speed: number;
    sort_delay_time: number;
    sort_transition_speed: number;
    animation_style: string;
    label_font_size: string;
    judge_count: number;
}

const DEFAULT_SETTINGS: AnimationSettings = {
    id: 1,
    label_display_time: 3000, // stored as ms in form, SQL schema uses NUMERIC but assumes ms for ease if we convert or keep as is. Actually schema default is 3.0. Let's store as MS.
    bar_transition_speed: 2000,
    sort_delay_time: 3000,
    sort_transition_speed: 1500,
    animation_style: 'Pop-in',
    label_font_size: 'text-8xl',
    judge_count: 3,
};

export default function AnimationSettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<AnimationSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('animation_settings')
                .select('*')
                .eq('id', 1)
                .single();

            if (error && error.code !== 'PGRST116') { // Ignore row not found
                console.error('Error fetching animation settings', error);
            } else if (data) {
                setSettings({
                    id: 1,
                    label_display_time: Number(data.label_display_time),
                    bar_transition_speed: Number(data.bar_transition_speed),
                    sort_delay_time: Number(data.sort_delay_time),
                    sort_transition_speed: Number(data.sort_transition_speed),
                    animation_style: data.animation_style || 'Pop-in',
                    label_font_size: data.label_font_size || 'text-8xl',
                    judge_count: data.judge_count ?? 3,
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const { error } = await supabase
                .from('animation_settings')
                .upsert({
                    id: 1,
                    label_display_time: settings.label_display_time,
                    bar_transition_speed: settings.bar_transition_speed,
                    sort_delay_time: settings.sort_delay_time,
                    sort_transition_speed: settings.sort_transition_speed,
                    animation_style: settings.animation_style,
                    label_font_size: settings.label_font_size,
                    judge_count: settings.judge_count,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // リザルト画面にリセットと再読み込みを促すイベントを送信
            await supabase.channel('animation_control').send({
                type: 'broadcast',
                event: 'reset',
                payload: { reloadSettings: true }
            });

            setMessage('設定を保存しました。コントロール画面へ戻ります...');
            setTimeout(() => {
                router.push('/admin/results-control');
            }, 1000);
        } catch (err) {
            console.error('Save error:', err);
            setMessage('保存時にエラーが発生しました。');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumeric = type === 'number' || ['label_display_time', 'bar_transition_speed', 'sort_delay_time', 'sort_transition_speed', 'judge_count'].includes(name);
        setSettings(prev => ({
            ...prev,
            [name]: isNumeric ? Number(value) : value
        }));
    };

    const timeOptions = [];
    for (let i = 0; i <= 10; i += 0.5) {
        timeOptions.push(
            <option key={i * 1000} value={i * 1000}>
                {i.toFixed(1)}秒
            </option>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-xl text-[var(--text-muted)]">読み込み中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">🎬 アニメーション設定</h1>
                        <p className="text-[var(--text-muted)]">リザルト画面のアニメーション時間やスタイルを調整します</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/admin/results-control" className="btn btn-outline btn-sm">表示コントロールへ</Link>
                        <Link href="/admin" className="btn btn-ghost btn-sm">← 管理画面</Link>
                    </div>
                </header>

                <div className="card">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Time Select Inputs */}
                            <div className="form-control">
                                <label className="label font-bold text-sm text-[var(--text-muted)]">
                                    項目名 表示時間
                                </label>
                                <select
                                    name="label_display_time"
                                    value={settings.label_display_time}
                                    onChange={handleChange}
                                    className="select select-bordered w-full"
                                    required
                                >
                                    {timeOptions}
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label font-bold text-sm text-[var(--text-muted)]">
                                    バー伸長 スピード
                                </label>
                                <select
                                    name="bar_transition_speed"
                                    value={settings.bar_transition_speed}
                                    onChange={handleChange}
                                    className="select select-bordered w-full"
                                    required
                                >
                                    {timeOptions}
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label font-bold text-sm text-[var(--text-muted)]">
                                    並べ替え前 待機時間
                                </label>
                                <select
                                    name="sort_delay_time"
                                    value={settings.sort_delay_time}
                                    onChange={handleChange}
                                    className="select select-bordered w-full"
                                    required
                                >
                                    {timeOptions}
                                </select>
                                <span className="text-xs text-zinc-500 mt-1">バーが伸びた後、順位が動くまでの間</span>
                            </div>

                            <div className="form-control">
                                <label className="label font-bold text-sm text-[var(--text-muted)]">
                                    並べ替え アニメスピード
                                </label>
                                <select
                                    name="sort_transition_speed"
                                    value={settings.sort_transition_speed}
                                    onChange={handleChange}
                                    className="select select-bordered w-full"
                                    required
                                >
                                    {timeOptions}
                                </select>
                            </div>

                            {/* Select Inputs */}
                            <div className="form-control">
                                <label className="label font-bold text-sm text-[var(--text-muted)]">
                                    項目名テキスト アニメーション
                                </label>
                                <select
                                    name="animation_style"
                                    value={settings.animation_style}
                                    onChange={handleChange}
                                    className="select select-bordered w-full"
                                >
                                    <option value="Pop-in">Pop-in (弾む)</option>
                                    <option value="Fade">Fade (フワッと表示)</option>
                                    <option value="Slide">Slide (横からスライド)</option>
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label font-bold text-sm text-[var(--text-muted)]">
                                    項目名テキスト 文字サイズ
                                </label>
                                <select
                                    name="label_font_size"
                                    value={settings.label_font_size}
                                    onChange={handleChange}
                                    className="select select-bordered w-full"
                                >
                                    <option value="text-6xl">小 (text-6xl)</option>
                                    <option value="text-8xl">中 (text-8xl)</option>
                                    <option value="text-9xl">大 (text-9xl)</option>
                                </select>
                            </div>

                            <div className="form-control">
                                <label className="label font-bold text-sm text-[var(--text-muted)]">
                                    審査員数 (1〜10)
                                </label>
                                <input
                                    type="number"
                                    name="judge_count"
                                    value={settings.judge_count || 3}
                                    onChange={handleChange}
                                    className="input input-bordered w-full"
                                    min="1"
                                    max="10"
                                    required
                                />
                                <span className="text-xs text-zinc-500 mt-1">ジャッジ用ログイン画面のボタン数に反映されます</span>
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-lg text-center font-bold ${message.includes('エラー') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                                {message}
                            </div>
                        )}

                        <div className="pt-4 border-t border-[var(--surface-border)] mt-6">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary w-full md:w-auto px-12"
                            >
                                {saving ? '保存中...' : '設定を保存'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
