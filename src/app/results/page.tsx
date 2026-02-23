'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RiderResult,
    ContestSettings,
    ITEM_COLORS,
} from '@/types';

// Count-up component for the total score
function AnimatedCounter({ value }: { value: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = displayValue;
        const end = value;
        if (start === end) return;

        const duration = 1500; // 1.5s for a smoother feel
        const startTime = performance.now();

        const update = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function (out-expo)
            const easeOutExpo = 1 - Math.pow(2, -10 * progress);
            const current = start + (end - start) * easeOutExpo;
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                setDisplayValue(end);
            }
        };
        requestAnimationFrame(update);
    }, [value]);

    return <span>{displayValue.toFixed(2)}</span>;
}

export default function ResultsPage() {
    const [results, setResults] = useState<RiderResult[]>([]);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [scoresRes, settingsRes] = await Promise.all([
                fetch('/api/scores', { cache: 'no-store' }),
                fetch('/api/admin/settings', { cache: 'no-store' }),
            ]);

            const scoresData = await scoresRes.json();
            const settingsData = await settingsRes.json();

            if (scoresData.success) {
                setResults(scoresData.data);
            }
            if (settingsData.success) {
                setSettings(settingsData.data);
            }
        } catch (error) {
            console.error('Failed to fetch results data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000); // 3s update
        return () => clearInterval(interval);
    }, []);

    const processedRankings = useMemo(() => {
        if (!settings || results.length === 0) return [];

        const enabledItems = settings.evaluationItems.filter(item => item.enabled);
        const revealedIds = settings.revealedItemIds || [];

        return results.map(res => {
            // Calculate breakdown based on judge scores
            // Each JudgeScore has .scores: JudgeItemScore[] (itemId, score)
            // We need to average these and multiply by weight
            const itemBreakdown = enabledItems.map((item, index) => {
                const itemScoresAcrossJudges = res.judgeScores.map(js => {
                    const s = js.scores.find(is => is.itemId === item.id);
                    return s ? s.score * item.weight : 0;
                });

                const avg = itemScoresAcrossJudges.length > 0
                    ? itemScoresAcrossJudges.reduce((a, b) => a + b, 0) / itemScoresAcrossJudges.length
                    : 0;

                return {
                    id: item.id,
                    name: item.name,
                    score: avg,
                    color: ITEM_COLORS[index % ITEM_COLORS.length],
                    revealed: revealedIds.includes(item.id)
                };
            });

            // Audience score
            const audienceBreakdown = {
                id: 'audience',
                name: 'Audience',
                score: res.audienceWeightedScore,
                color: '#f87171',
                revealed: revealedIds.includes('audience')
            };

            const allItems = [...itemBreakdown, audienceBreakdown];
            const currentDisplayedScore = allItems
                .filter(item => item.revealed)
                .reduce((sum, item) => sum + item.score, 0);

            return {
                ...res,
                allItems,
                currentDisplayedScore,
            };
        }).sort((a, b) => b.totalScore - a.totalScore); // Keep sorted by final total for fixed positions or reordering
    }, [results, settings]);

    if (loading || !settings) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
                <div className="text-4xl font-bold animate-pulse tracking-widest italic">LOADING RESULTS...</div>
            </div>
        );
    }

    const enabledItems = settings.evaluationItems.filter(item => item.enabled);

    return (
        <div className="h-screen w-screen bg-[#0a0a0a] text-white p-4 font-black uppercase overflow-hidden flex flex-col">
            {/* Minimal Legend/Settings indicator at the top */}
            <div className="flex justify-end gap-x-4 mb-2 opacity-50">
                {enabledItems.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-1">
                        <div
                            className="w-3 h-3 border border-white/30"
                            style={{ backgroundColor: ITEM_COLORS[i % ITEM_COLORS.length] }}
                        />
                        <span className="text-xs text-zinc-400">{item.name}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 border border-white/30 bg-[#f87171]" />
                    <span className="text-xs text-zinc-400">Audience</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-0">
                <AnimatePresence mode="popLayout">
                    {processedRankings.map((res, index) => (
                        <motion.div
                            key={res.rider.id}
                            layout
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{
                                layout: { type: 'spring', damping: 20, stiffness: 100 },
                                opacity: { duration: 0.4 }
                            }}
                            className="relative flex items-center gap-4 flex-1 min-h-0"
                        >
                            {/* Rank & Name */}
                            <div className="w-[200px] md:w-[350px] flex items-center gap-4 shrink-0">
                                <div className="text-4xl md:text-6xl w-10 md:w-16 text-zinc-800 italic font-black shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xl md:text-3xl text-white truncate font-black tracking-tight">{res.rider.riderName}</span>
                                    <span className="text-xs md:text-md text-zinc-500 font-bold truncate">{res.rider.name}</span>
                                </div>
                            </div>

                            {/* Stacked Bar Container */}
                            <div className="flex-1 bg-zinc-900/50 border border-white/10 h-3/4 max-h-16 relative overflow-hidden flex shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                {res.allItems.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={false}
                                        animate={{
                                            width: item.revealed ? `${(item.score / 125) * 100}%` : '0%'
                                        }}
                                        transition={{ type: 'spring', stiffness: 40, damping: 12, mass: 0.5 }}
                                        style={{ backgroundColor: item.color }}
                                        className="h-full relative"
                                    />
                                ))}
                            </div>

                            {/* Score Display */}
                            <div className="w-24 md:w-40 text-right shrink-0">
                                <div className="text-3xl md:text-6xl font-black italic tracking-tighter text-[#fffa00] drop-shadow-[0_0_20px_rgba(255,250,0,0.3)]">
                                    <AnimatedCounter value={res.currentDisplayedScore} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Decorative BG Text */}
            <div className="fixed bottom-[2%] right-[2%] pointer-events-none opacity-[0.02] z-[-1] select-none text-[15vw] font-black leading-none italic">
                {settings.contestName || 'FINAL'}
            </div>
            <div className="fixed top-20 left-[-5%] pointer-events-none opacity-[0.02] z-[-1] select-none text-[15vw] font-black leading-none">
                STANDINGS
            </div>

            <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap');
        
        body {
          background-color: #0a0a0a;
          font-family: 'Archivo Black', sans-serif;
          overflow-x: hidden;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
        </div>
    );
}
