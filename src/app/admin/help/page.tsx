'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HelpPage() {
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

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
                    <Link href="/admin/logs" className="nav-item">
                        ログ
                    </Link>
                    <Link href="/admin/help" className="nav-item active">
                        使い方
                    </Link>
                </nav>
            </header>

            {/* Help Content */}
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="card">
                    <h2 className="text-xl font-bold mb-4">📖 使い方ガイド</h2>
                    <p className="text-[var(--text-muted)]">
                        BMX Flatland ジャッジ＆観客投票システムの使い方を説明します。
                    </p>
                </div>

                {/* 運営の操作手順 */}
                <div className="card">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm">1</span>
                        運営の操作手順
                    </h3>
                    <div className="space-y-4 text-[var(--text-muted)]">
                        <div className="p-4 bg-[var(--surface-light)] rounded-xl">
                            <h4 className="font-bold text-[var(--foreground)] mb-2">① 選手を登録</h4>
                            <p>「選手管理」ページで選手を追加します。名前とライダーネームを入力してください。</p>
                        </div>
                        <div className="p-4 bg-[var(--surface-light)] rounded-xl">
                            <h4 className="font-bold text-[var(--foreground)] mb-2">② 現在の選手を設定</h4>
                            <p>ダッシュボードの「現在パフォーマンス中の選手」セクションで、パフォーマンス中の選手を選択します。観客はこの選手にのみ投票できます。</p>
                        </div>
                        <div className="p-4 bg-[var(--surface-light)] rounded-xl">
                            <h4 className="font-bold text-[var(--foreground)] mb-2">③ 投票を開始</h4>
                            <p>「投票を開始」ボタンをクリックすると、観客からの投票を受け付けます。</p>
                        </div>
                        <div className="p-4 bg-[var(--surface-light)] rounded-xl">
                            <h4 className="font-bold text-[var(--foreground)] mb-2">④ 次の選手へ</h4>
                            <p>選手のパフォーマンス終了後、次の選手を選択します。投票は自動的に次の選手に切り替わります。</p>
                        </div>
                    </div>
                </div>

                {/* 観客用アプリ */}
                <div className="card">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center text-white text-sm">2</span>
                        観客用アプリ
                    </h3>
                    <div className="space-y-3 text-[var(--text-muted)]">
                        <p>観客はQRコードまたはURLから <code className="bg-[var(--surface-light)] px-2 py-1 rounded">/audience</code> にアクセスします。</p>
                        <ul className="list-disc list-inside space-y-2">
                            <li>運営が選手を選択し、投票を開始するまで待機画面が表示されます</li>
                            <li>現在の選手が表示されたら、★1〜5点で投票できます</li>
                            <li>各選手に1回のみ投票可能です</li>
                        </ul>
                        <div className="mt-4 p-3 bg-[var(--primary)] bg-opacity-10 rounded-xl">
                            <p className="text-sm">
                                <strong>観客用URL:</strong><br />
                                <code className="text-[var(--primary)]">{origin}/audience</code>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ジャッジ用アプリ */}
                <div className="card">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm">3</span>
                        ジャッジ用アプリ
                    </h3>
                    <div className="space-y-3 text-[var(--text-muted)]">
                        <p>ジャッジは <code className="bg-[var(--surface-light)] px-2 py-1 rounded">/judge</code> にアクセスします。</p>
                        <ul className="list-disc list-inside space-y-2">
                            <li>最初に自分のジャッジ名を選択します</li>
                            <li>採点する選手を選んで、各評価項目を採点します</li>
                            <li>採点は一度送信すると変更できません</li>
                        </ul>
                        <div className="mt-4 p-3 bg-[var(--primary)] bg-opacity-10 rounded-xl">
                            <p className="text-sm">
                                <strong>ジャッジ用URL:</strong><br />
                                <code className="text-[var(--primary)]">{origin}/judge</code>
                            </p>
                        </div>
                    </div>
                </div>

                {/* スコア計算 */}
                <div className="card">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm">4</span>
                        スコア計算
                    </h3>
                    <div className="space-y-3 text-[var(--text-muted)]">
                        <p>総合スコアは以下の2つの要素から計算されます：</p>
                        <ul className="list-disc list-inside space-y-2">
                            <li><strong>ジャッジ点</strong>：各ジャッジの採点の平均（100点満点）</li>
                            <li><strong>観客点</strong>：観客投票の平均 × ウエイト</li>
                        </ul>
                        <p>「大会設定」ページで観客点のウエイトを調整できます。</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
