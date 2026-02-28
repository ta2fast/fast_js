'use client';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

import { useState, useEffect, useMemo, useRef } from 'react';
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
function AnimatedCounter({ value, duration = 3000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = displayValue;
        const end = value;
        if (start === end) return;

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
    }, [value, duration]);

    return <span>{displayValue.toFixed(2)}</span>;
}

export default function ResultsPage() {
    const [results, setResults] = useState<RiderResult[]>([]);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [revealingItem, setRevealingItem] = useState<string | null>(null);
    const [activeHighlightItem, setActiveHighlightItem] = useState<string | null>(null);
    const [barRevealedIds, setBarRevealedIds] = useState<string[]>([]);  // Stage 1: bars extend
    const [displayedIds, setDisplayedIds] = useState<string[]>([]);      // Stage 2: score confirmed
    const [sortingIds, setSortingIds] = useState<string[]>([]);          // Stage 3: rank reorder
    const [animationSortDuration, setAnimationSortDuration] = useState(0.8);

    // Track revealed items to play sound only on "new" reveals
    const prevRevealedCount = useRef(0);
    const prevRevealedIds = useRef<string[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);

    const barTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const displayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const sortTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const animatingRef = useRef(false);

    const playRevealSound = () => {
        if (!audioEnabled) return;

        try {
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();
            }

            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                // Sparkling frequency sweep
                osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const now = ctx.currentTime;
            // High-pitched chime chord
            playTone(880.00, now, 0.6, 0.1);    // A5
            playTone(1108.73, now + 0.05, 0.5, 0.07); // C#6
            playTone(1318.51, now + 0.1, 0.4, 0.05);  // E6
            playTone(1760.00, now + 0.15, 0.3, 0.03); // A6
        } catch (e) {
            console.error('Web Audio failed:', e);
        }
    };

    const enableAudio = () => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        ctx.resume().then(() => {
            setAudioEnabled(true);
            // Play a silent seed tone to unlock
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        });
    };

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
                const newSettings = settingsData.data as ContestSettings;

                // Debug Log for Settings Updates
                if (settings?.animationStyle !== newSettings.animationStyle ||
                    settings?.labelFontSize !== newSettings.labelFontSize) {
                    console.log(`[Results] Settings Change Detected: Style=${newSettings.animationStyle}, Size=${newSettings.labelFontSize}`);
                }

                setSettings(newSettings);
                const newIds = newSettings.revealedItemIds || [];
                const newCount = newIds.length;

                // Play sound and flash overlay if items were revealed
                if (settings && newCount > prevRevealedCount.current && !animatingRef.current) {
                    playRevealSound();

                    // Find which ID was just added
                    const newlyAddedId = newIds.find(id => !prevRevealedIds.current.includes(id));
                    if (newlyAddedId) {
                        let itemName = '';
                        if (newlyAddedId === 'audience') {
                            itemName = 'AUDIENCE SCORE';
                        } else {
                            const item = newSettings.evaluationItems.find(i => i.id === newlyAddedId);
                            itemName = item?.name || '';
                        }

                        if (itemName) {
                            // Mark animation as in progress
                            animatingRef.current = true;

                            const labelMs = newSettings.animationDelayLabelMs ?? 3000;
                            const barMs = newSettings.animationBarDurationMs ?? 3000;
                            const sortDelayMs = newSettings.animationSortDelayMs ?? 3000;
                            const sortDurationMs = newSettings.animationSortDurationMs ?? 800;

                            setAnimationSortDuration(sortDurationMs / 1000);

                            // Sequence execution loop
                            const runSequence = async () => {
                                try {
                                    // === Step A: Label Display ===
                                    setActiveHighlightItem(itemName);
                                    setRevealingItem(itemName);
                                    await wait(labelMs);

                                    // Exit Step A and WAIT for the exit transition (opacity/scale) to complete
                                    setRevealingItem(null);
                                    await wait(500); // Wait 500ms for framer-motion exit animation

                                    // === Step B: Bar Extension & Counter ===
                                    // Start both simultaneously after Label is GONE
                                    setBarRevealedIds(newIds);
                                    setDisplayedIds(newIds);
                                    await wait(barMs);

                                    // === Step C: Sort Delay (Confirmation Pause) ===
                                    await wait(sortDelayMs);

                                    // === Step D: Sorting (Layout Transition) ===
                                    setSortingIds(newIds);
                                    await wait(sortDurationMs);

                                    // Final Step: Clear high-visibility highlight in Legend
                                    setActiveHighlightItem(null);
                                } finally {
                                    animatingRef.current = false;
                                }
                            };

                            runSequence();
                        } else {
                            // Fallback if no item matched
                            setBarRevealedIds(newIds);
                            setDisplayedIds(newIds);
                            setSortingIds(newIds);
                        }
                    } else {
                        // This else block means newCount > prevRevealedCount.current but no newlyAddedId was found.
                        // This shouldn't happen if newIds are always unique and added one by one.
                        // For safety, update states directly.
                        console.warn("[Results] New items revealed but no single newly added ID found. Updating states directly.");
                        setBarRevealedIds(newIds);
                        setDisplayedIds(newIds);
                        setSortingIds(newIds);
                    }
                } else if (!settings) {
                    // Initial load
                    console.log("[Results] Initial load, setting all revealed IDs.");
                    setBarRevealedIds(newIds);
                    setDisplayedIds(newIds);
                    setSortingIds(newIds);
                } else if (newCount < prevRevealedCount.current) {
                    // Items were removed — reset immediately
                    console.log("[Results] Items removed, resetting all revealed IDs.");
                    if (barTimeoutRef.current) clearTimeout(barTimeoutRef.current);
                    if (displayTimeoutRef.current) clearTimeout(displayTimeoutRef.current);
                    if (sortTimeoutRef.current) clearTimeout(sortTimeoutRef.current);
                    animatingRef.current = false;
                    setBarRevealedIds(newIds);
                    setDisplayedIds(newIds);
                    setSortingIds(newIds);
                }
                // If newCount === prevRevealedCount.current AND animating, do nothing (let timeouts finish)

                prevRevealedCount.current = newCount;
                prevRevealedIds.current = newIds;
                setSettings(newSettings);
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
    }, [audioEnabled, settings]);

    const processedRankings = useMemo(() => {
        if (!settings || results.length === 0) return [];

        const enabledItems = settings.evaluationItems.filter(item => item.enabled);

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
                    revealed: barRevealedIds.includes(item.id)  // Stage 1: bars use barRevealedIds
                };
            });

            // Audience score
            const audienceBreakdown = {
                id: 'audience',
                name: 'Audience',
                score: res.audienceWeightedScore,
                color: '#f87171',
                revealed: barRevealedIds.includes('audience')  // Stage 1: bars use barRevealedIds
            };

            const allItems = [...itemBreakdown, audienceBreakdown];

            // Score counter uses displayedIds (Stage 2: score confirmed)
            const currentDisplayedScore = allItems
                .filter(item => displayedIds.includes(item.id))
                .reduce((sum, item) => sum + item.score, 0);

            const sortingScore = allItems
                .filter(item => sortingIds.includes(item.id))
                .reduce((sum, item) => sum + item.score, 0);

            return {
                ...res,
                allItems,
                currentDisplayedScore,
                sortingScore
            };
        }).sort((a, b) => b.sortingScore - a.sortingScore); // 順位変更のタイミングを制御するためsortingScoreを使用
    }, [results, settings, barRevealedIds, displayedIds, sortingIds]);

    if (loading || !settings) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
                <div className="text-4xl font-bold animate-pulse tracking-widest italic">LOADING RESULTS...</div>
            </div>
        );
    }

    const enabledItems = settings.evaluationItems.filter(item => item.enabled);

    return (
        <div className="h-screen w-screen bg-black text-white p-4 uppercase overflow-hidden flex flex-col relative">
            {/* Audio Activator Overlay */}
            <AnimatePresence>
                {!audioEnabled && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 text-center cursor-pointer"
                        onClick={enableAudio}
                    >
                        <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="bg-[#fffa00] text-black px-12 py-6 rounded-full text-3xl md:text-5xl font-black mb-8 shadow-[0_0_50px_rgba(255,250,0,0.5)]"
                        >
                            CLICK TO START
                        </motion.div>
                        <p className="text-zinc-400 text-xl tracking-widest italic">
                            ACTIVATE AUDIO FOR THE SHOW
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Now Revealing Overlay */}
            <AnimatePresence>
                {revealingItem && (
                    <motion.div
                        className="fixed inset-0 z-[60] flex flex-col items-center justify-center pointer-events-none"
                    >
                        {/* Flash Effect Helper */}
                        {settings.animationStyle === 'Flash' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 0.4, times: [0, 0.2, 1] }}
                                className="fixed inset-0 bg-white z-[61]"
                            />
                        )}

                        <motion.div
                            key={settings.animationStyle} // Ensure re-render when style changes
                            variants={{
                                initial: settings.animationStyle === 'Pop-in' ? { opacity: 0, scale: 0 } :
                                    settings.animationStyle === 'Slide' ? { x: '-100vw', opacity: 0, rotate: -10 } :
                                        settings.animationStyle === 'Flash' ? { opacity: 0, scale: 1.5 } :
                                            { opacity: 0, scale: 0.9 },
                                animate: settings.animationStyle === 'Pop-in' ? { opacity: 1, scale: [0, 1.25, 1], rotate: [0, -5, 0] } :
                                    settings.animationStyle === 'Slide' ? { x: 0, opacity: 1, rotate: 0 } :
                                        settings.animationStyle === 'Flash' ? {
                                            opacity: 1,
                                            scale: 1,
                                            filter: ['brightness(1)', 'brightness(10)', 'brightness(1)'],
                                            textShadow: ['0 0 0px #fff', '0 0 50px #fff', '0 0 10px #fff']
                                        } :
                                            { opacity: 1, scale: 1 },
                                exit: settings.animationStyle === 'Pop-in' ? { opacity: 0, scale: 2, filter: 'blur(20px)' } :
                                    settings.animationStyle === 'Slide' ? { x: '100vw', opacity: 0, rotate: 10 } :
                                        settings.animationStyle === 'Flash' ? { opacity: 0, scale: 0.8, filter: 'blur(10px)' } :
                                            { opacity: 0, scale: 1.1, filter: 'blur(10px)' }
                            }}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={
                                settings.animationStyle === 'Slide'
                                    ? { type: 'spring', damping: 12, stiffness: 90 }
                                    : { duration: 0.5 }
                            }
                            className={`
                                font-black tracking-tighter leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] text-center px-4
                                ${settings.labelFontSize === 'Small' ? 'text-4xl md:text-6xl' : ''}
                                ${settings.labelFontSize === 'Medium' ? 'text-6xl md:text-[8vw]' : ''}
                                ${settings.labelFontSize === 'Large' ? 'text-8xl md:text-[12vw]' : ''}
                                ${settings.labelFontSize === 'Extra Large' ? 'text-[12vw] md:text-[18vw]' : ''}
                                ${!settings.labelFontSize ? 'text-6xl md:text-[8vw]' : ''}
                            `}
                        >
                            {revealingItem}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* High-visibility Legend */}
            <div className="flex justify-end gap-x-8 mb-6 opacity-90 border-b border-white/20 pb-4 h-12 items-end">
                {enabledItems.map((item, i) => {
                    const isActive = item.name === activeHighlightItem;
                    return (
                        <motion.div
                            key={item.id}
                            animate={isActive ? { scale: 1.3, y: -5 } : { scale: 1, y: 0 }}
                            className={`flex items-center gap-2 transition-colors ${isActive ? 'text-[#fffa00]' : 'text-white'}`}
                        >
                            <div
                                className={`w-4 h-4 border-2 ${isActive ? 'border-[#fffa00] shadow-[0_0_10px_rgba(255,250,0,0.8)]' : 'border-white'}`}
                                style={{ backgroundColor: OUTDOOR_COLORS[i % OUTDOOR_COLORS.length] }}
                            />
                            <span className={`text-sm md:text-base font-black tracking-tight ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,250,0,0.6)]' : ''}`}>
                                {item.name}
                            </span>
                        </motion.div>
                    );
                })}
                <motion.div
                    animate={activeHighlightItem === 'AUDIENCE SCORE' ? { scale: 1.3, y: -5 } : { scale: 1, y: 0 }}
                    className={`flex items-center gap-2 transition-colors ${activeHighlightItem === 'AUDIENCE SCORE' ? 'text-[#fffa00]' : 'text-white'}`}
                >
                    <div className={`w-4 h-4 border-2 ${activeHighlightItem === 'AUDIENCE SCORE' ? 'border-[#fffa00] shadow-[0_0_10px_rgba(255,250,0,0.8)]' : 'border-white'} bg-[#f87171]`} />
                    <span className={`text-sm md:text-base font-black tracking-tight ${activeHighlightItem === 'AUDIENCE SCORE' ? 'drop-shadow-[0_0_8px_rgba(255,250,0,0.6)]' : ''}`}>
                        Audience
                    </span>
                </motion.div>
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
                                layout: { type: 'spring', damping: 25, stiffness: 120, mass: 0.8, duration: animationSortDuration },
                                opacity: { duration: 0.3 }
                            }}
                            className={`relative flex items-center gap-4 ${index < 3 ? 'flex-[1.3] py-2 md:py-3' : 'flex-1 py-1 md:py-2'} min-h-0 bg-zinc-900/40 rounded-lg pr-4 border-l-[12px] ${index < 3 ? 'shadow-[0_0_20px_rgba(255,250,0,0.2)]' : ''}`}
                            style={{
                                borderLeftColor: index === 0 ? '#fffa00' : index === 1 ? '#e2e8f0' : index === 2 ? '#b45309' : '#333'
                            }}
                        >
                            {/* Rank & Name */}
                            <div className="w-[160px] md:w-[300px] flex items-center gap-3 shrink-0 pl-4">
                                <motion.div
                                    animate={index === 0 ? { scale: [1, 1.1, 1] } : {}}
                                    transition={index === 0 ? { repeat: Infinity, duration: 2 } : {}}
                                    className={`${index < 3 ? 'text-4xl md:text-6xl w-14 md:w-24' : 'text-3xl md:text-4xl w-10 md:w-16'} font-bold shrink-0 ${index === 0 ? 'text-[#fffa00] drop-shadow-[0_0_10px_rgba(255,250,0,0.8)]' :
                                        index === 1 ? 'text-[#e2e8f0] drop-shadow-[0_0_10px_rgba(226,232,240,0.8)]' :
                                            index === 2 ? 'text-[#b45309] drop-shadow-[0_0_10px_rgba(180,83,9,0.8)]' :
                                                'text-zinc-600'
                                        }`}
                                >
                                    {index + 1}
                                </motion.div>
                                <div className="flex flex-col min-w-0">
                                    <span className={`${index < 3 ? 'text-xl md:text-3xl' : 'text-lg md:text-xl'} text-white truncate font-black tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}>{res.rider.riderName}</span>
                                </div>
                            </div>

                            {/* Stacked Bar Container */}
                            <div className="flex-1 bg-black h-[50%] md:h-16 relative overflow-hidden flex ring-4 ring-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                {res.allItems.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={false}
                                        animate={{
                                            width: item.revealed ? `${(item.score / 125) * 100}%` : '0%'
                                        }}
                                        transition={{
                                            type: 'tween',
                                            duration: (settings.animationBarDurationMs ?? 3000) / 1000,
                                            ease: 'easeOut'
                                        }}
                                        style={{
                                            backgroundColor: item.color,
                                            boxShadow: item.revealed ? `inset 0 0 20px rgba(255,255,255,0.4), 0 0 15px ${item.color}66` : 'none'
                                        }}
                                        className="h-full relative flex items-center justify-center overflow-hidden"
                                    >
                                        {item.revealed && item.score > 2 && (
                                            <motion.span
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 1 }}
                                                className="text-black font-bold text-sm md:text-lg tracking-tight whitespace-nowrap"
                                            >
                                                {item.score.toFixed(1)}
                                            </motion.span>
                                        )}
                                    </motion.div>
                                ))}
                            </div>

                            <div className="w-24 md:w-40 text-right shrink-0">
                                <div className={`${index < 3 ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl'} font-bold tracking-tight text-[#fffa00] drop-shadow-[0_0_10px_rgba(255,250,0,0.5)]`}>
                                    <AnimatedCounter
                                        value={res.currentDisplayedScore}
                                        duration={settings.animationBarDurationMs ?? 3000}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <style jsx global>{`
        body {
          background-color: black;
          overflow: hidden;
        }
      `}</style>
        </div>
    );
}
