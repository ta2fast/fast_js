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
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-black uppercase overflow-x-hidden">
            <header className="mb-14 flex flex-col md:flex-row md:items-end justify-between border-b-8 border-white pb-6 gap-4">
                <div>
                    <h1 className="text-7xl md:text-9xl leading-none tracking-tighter">
                        {settings.contestName || 'RESULTS'}
                    </h1>
                    <p className="text-3xl text-zinc-500 mt-2 font-bold">{settings.contestDate}</p>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 justify-start md:justify-end max-w-2xl">
                    {enabledItems.map((item, i) => (
                        <div key={item.id} className="flex items-center gap-2">
                            <div
                                className="w-5 h-5 border-2 border-white/50"
                                style={{ backgroundColor: ITEM_COLORS[i % ITEM_COLORS.length] }}
                            />
                            <span className="text-lg md:text-xl text-zinc-300">{item.name}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/50 bg-[#f87171]" />
                        <span className="text-lg md:text-xl text-zinc-300">Audience</span>
                    </div>
                </div>
            </header>

            <div className="flex flex-col gap-8 pb-32">
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
                            className="relative flex items-center gap-4 md:gap-8 h-20 md:h-28"
                        >
                            {/* Rank & Name */}
                            <div className="w-[300px] md:w-[450px] flex items-center gap-4 md:gap-8 shrink-0">
                                <div className="text-6xl md:text-8xl w-16 md:w-28 text-zinc-800 italic font-black shrink-0">
                                    {index + 1}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-3xl md:text-5xl text-white truncate font-black tracking-tight">{res.rider.riderName}</span>
                                    <span className="text-lg md:text-2xl text-zinc-500 font-bold">{res.rider.name}</span>
                                </div>
                            </div>

                            {/* Stacked Bar Container */}
                            <div className="flex-1 bg-zinc-900/50 border-2 border-white/10 h-12 md:h-20 relative overflow-hidden flex shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                {res.allItems.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={false}
                                        animate={{
                                            width: item.revealed ? `${(item.score / 125) * 100}%` : '0%'
                                        }}
                                        transition={{ type: 'spring', stiffness: 40, damping: 12, mass: 0.5 }}
                                        style={{ backgroundColor: item.color }}
                                        className="h-full relative group"
                                    >
                                        {item.revealed && item.score > 2 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                                            >
                                                <span className="text-[10px] md:text-xs text-black/40 font-black truncate px-1">
                                                    {item.name}
                                                </span>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>

                            {/* Score Display */}
                            <div className="w-32 md:w-60 text-right shrink-0">
                                <div className="text-5xl md:text-8xl font-black italic tracking-tighter text-[#fffa00] drop-shadow-[0_0_20px_rgba(255,250,0,0.3)]">
                                    <AnimatedCounter value={res.currentDisplayedScore} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Decorative BG Text */}
            <div className="fixed bottom-[-5%] right-[-5%] pointer-events-none opacity-[0.03] z-[-1] select-none text-[25vw] font-black leading-none italic">
                FINAL
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
