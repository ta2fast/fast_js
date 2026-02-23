'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RiderResult,
    ContestSettings,
} from '@/types';

// Outdoor-optimized high-contrast neon palette
const OUTDOOR_COLORS = [
    '#ff0055', // Power Pink
    '#00ff99', // Spring Green
    '#00ccff', // Electric Blue
    '#ffff00', // Mega Yellow
    '#ff9900', // Vivid Orange
    '#cc33ff', // Magic Purple
    '#ff3300', // Blaze Red
    '#33ff00', // Lime Punch
];

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
                    color: OUTDOOR_COLORS[index % OUTDOOR_COLORS.length],
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
        }).sort((a, b) => b.currentDisplayedScore - a.currentDisplayedScore); // 表示スコア順にソートして順位入れ替えを実現
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
        <div className="h-screen w-screen bg-black text-white p-4 font-black uppercase overflow-hidden flex flex-col">
            {/* High-visibility Legend */}
            <div className="flex justify-end gap-x-6 mb-4 opacity-90 border-b border-white/20 pb-2">
                {enabledItems.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2">
                        <div
                            className="w-4 h-4 border-2 border-white"
                            style={{ backgroundColor: OUTDOOR_COLORS[i % OUTDOOR_COLORS.length] }}
                        />
                        <span className="text-xs md:text-sm text-white font-black">{item.name}</span>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white bg-[#f87171]" />
                    <span className="text-xs md:text-sm text-white font-black">Audience</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-3 min-h-0">
                <AnimatePresence mode="popLayout" initial={false}>
                    {processedRankings.map((res, index) => (
                        <motion.div
                            key={res.rider.id}
                            layout
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{
                                layout: { type: 'spring', damping: 25, stiffness: 120, mass: 0.8 },
                                opacity: { duration: 0.3 }
                            }}
                            className="relative flex items-center gap-4 flex-1 min-h-0 bg-zinc-900/40 rounded-lg pr-4 border-l-[12px]"
                            style={{ borderLeftColor: index < 3 ? '#fffa00' : '#333' }}
                        >
                            {/* Rank & Name */}
                            <div className="w-[180px] md:w-[320px] flex items-center gap-4 shrink-0 pl-4">
                                <div className={`text-5xl md:text-7xl w-14 md:w-24 italic font-black shrink-0 ${index < 3 ? 'text-[#fffa00]' : 'text-zinc-600'}`}>
                                    {index + 1}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-2xl md:text-4xl text-white truncate font-black tracking-tighter leading-none">{res.rider.riderName}</span>
                                    <span className="text-xs md:text-sm text-zinc-400 font-bold truncate mt-1">{res.rider.name}</span>
                                </div>
                            </div>

                            {/* Stacked Bar Container */}
                            <div className="flex-1 bg-black h-[50%] md:h-20 relative overflow-hidden flex ring-4 ring-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                {res.allItems.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={false}
                                        animate={{
                                            width: item.revealed ? `${(item.score / 125) * 100}%` : '0%'
                                        }}
                                        transition={{ type: 'spring', stiffness: 60, damping: 15, mass: 0.5 }}
                                        style={{
                                            backgroundColor: item.color,
                                            boxShadow: item.revealed ? `inset 0 0 20px rgba(255,255,255,0.4), 0 0 15px ${item.color}66` : 'none'
                                        }}
                                        className="h-full relative"
                                    />
                                ))}
                            </div>

                            {/* Score Display */}
                            <div className="w-32 md:w-56 text-right shrink-0">
                                <div className="text-4xl md:text-8xl font-black italic tracking-tighter text-[#fffa00] drop-shadow-[0_0_15px_rgba(255,250,0,0.6)]">
                                    <AnimatedCounter value={res.currentDisplayedScore} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* High-visibility Decorative BG */}
            <div className="fixed bottom-[2%] left-[2%] pointer-events-none opacity-[0.05] z-[-1] select-none text-[15vw] font-black leading-none italic text-white/50">
                {settings.contestName || 'BMX FINAL'}
            </div>

            <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap');
        
        body {
          background-color: black;
          font-family: 'Archivo Black', sans-serif;
          overflow: hidden;
        }
      `}</style>
        </div>
    );
}
