'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RiderResult } from '@/types';

export default function StandingsPage() {
  const [results, setResults] = useState<RiderResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const res = await fetch('/api/scores', { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch scores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
    const interval = setInterval(fetchScores, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-xl text-[var(--text-muted)]">ランキング読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">🏆 大会結果・順位</h1>
          <p className="text-[var(--text-muted)]">リアルタイム順位（5秒更新）</p>
        </header>

        <div className="grid gap-4">
          {results.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-[var(--text-muted)]">現在集計中のデータはありません</p>
            </div>
          ) : (
            results.map((result) => (
              <div
                key={result.riderId}
                className={`card flex items-center gap-4 transition-all hover:scale-[1.01] ${result.rank === 1 ? 'border-[var(--secondary)] border-2' : ''}`}
              >
                {/* Rank Section */}
                <div className={`w-12 h-12 flex items-center justify-center rounded-full text-2xl font-bold ${result.rank === 1 ? 'bg-[var(--secondary)] text-white' :
                  result.rank === 2 ? 'bg-slate-300 text-slate-800' :
                    result.rank === 3 ? 'bg-amber-600 text-white' :
                      'bg-[var(--surface-light)]'
                  }`}>
                  {result.rank}
                </div>

                {/* Rider Info */}
                <div className="flex-1">
                  <h2 className="text-xl font-bold line-clamp-1">{result.rider.riderName}</h2>
                  <p className="text-sm text-[var(--text-muted)] line-clamp-1">{result.rider.name}</p>
                </div>

                {/* Score Section */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-[var(--secondary)]">
                    {result.totalScore.toFixed(2)}
                    <span className="text-sm ml-1">pts</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    Judge: {result.judgeAverage.toFixed(1)} / Aud: {result.audienceAverage.toFixed(1)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/audience"
            className="btn btn-ghost"
          >
            ← 投票画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
}