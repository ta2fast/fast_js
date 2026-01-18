'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function JudgePage() {
    const [loading, setLoading] = useState(false);

    const sendScore = async (points: number) => {
        setLoading(true);
        try {
            // 1. 匿名ログインを実行（自動でIDが割り振られます）
            await supabase.auth.signInAnonymously();

            // 2. データを保存（テーブル名が 'judgments' の場合）
            const { error } = await supabase
                .from('judgments')
                .insert([{ score: points, player_name: "選手A" }]);

            if (error) {
                alert("送信失敗...");
                console.error('Supabase error:', error);
            } else {
                alert(points + "点を送信しました！");
            }
        } catch (error) {
            alert("送信失敗...");
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            <h1>ジャッジ画面</h1>
            <button onClick={() => sendScore(10)} disabled={loading}>
                10点
            </button>
            <button onClick={() => sendScore(5)} disabled={loading}>
                5点
            </button>
        </div>
    );
}
