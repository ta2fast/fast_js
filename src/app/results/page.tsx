'use client';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RiderResult,
    ContestSettings,
    DEFAULT_CONTEST_SETTINGS,
    ApiResponse,
} from '@/types';
import { supabase } from '@/lib/supabase';

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

// Animation Constants
const LABEL_DISPLAY_TIME = 3000;      // ms
const BAR_TRANSITION_SPEED = 2000;    // ms
const SORT_DELAY_TIME = 3000;         // ms
const SORT_TRANSITION_SPEED = 1500;    // ms
const ANIMATION_STYLE = 'Pop-in';
const LABEL_FONT_SIZE_CLASS = 'text-8xl md:text-[12vw]'; // Large

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
    // === Display state (what the user sees - only updated after animation) ===
    const [displayResults, setDisplayResults] = useState<RiderResult[]>([]);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [revealingItem, setRevealingItem] = useState<string | null>(null);
    const [activeHighlightItem, setActiveHighlightItem] = useState<string | null>(null);
    const [barRevealedIds, setBarRevealedIds] = useState<string[]>([]);  // Stage 1: bars extend
    const [displayedIds, setDisplayedIds] = useState<string[]>([]);      // Stage 2: score confirmed
    const [sortingIds, setSortingIds] = useState<string[]>([]);          // Stage 3: rank reorder
    const [animationSortDuration, setAnimationSortDuration] = useState(0.8);

    const latestResultsRef = useRef<RiderResult[]>([]);

    // === Animation lock ===
    const isAnimatingRef = useRef(false);

    // Track revealed items for initial load
    const initialLoadDone = useRef(false);

    const audioContextRef = useRef<AudioContext | null>(null);

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



    // === Fetch data WITHOUT updating display (background sync) ===
    const fetchDataSilent = useCallback(async () => {
        try {
            const scoresRes = await fetch('/api/scores', { cache: 'no-store' });
            const scoresData = await scoresRes.json();

            if (!scoresData.success) {
                console.warn('[Results] Partial data fetch failed');
                return;
            }

            const currentResults = scoresData.data as RiderResult[];
            latestResultsRef.current = currentResults;

            // First load initialization
            if (!initialLoadDone.current) {
                initialLoadDone.current = true;
                setDisplayResults(currentResults);
                setSettings(DEFAULT_CONTEST_SETTINGS);

                // Start with all bars hidden (0%) and 0 scores displayed
                setBarRevealedIds([]);
                setDisplayedIds([]);
                setSortingIds([]);

                setLoading(false);
                return;
            }

            // Sync latest results silently in background
            setDisplayResults(currentResults);

        } catch (error) {
            console.error('[Results] fetchDataSilent error:', error);
        }
    }, []);

    // === Handle Broadcast Action ===
    const handleBroadcastEvent = useCallback(async (payload: any) => {
        if (isAnimatingRef.current) return;

        try {
            isAnimatingRef.current = true;
            // Force data refresh before animation
            await fetchDataSilent();

            const eventType = payload.event;
            const data = payload.payload;

            const labelMs = LABEL_DISPLAY_TIME;
            const barMs = BAR_TRANSITION_SPEED;
            const sortDurationMs = SORT_TRANSITION_SPEED;

            if (eventType === 'reveal_item') {
                const { itemId, itemName } = data;
                playRevealSound();

                console.log(`[Animation] Revealing: ${itemName}`);
                setActiveHighlightItem(itemName);
                setRevealingItem(itemName);
                await wait(labelMs);

                setRevealingItem(null);
                await wait(500); // small pause after label disappears

                // Extend only this specific bar and update score
                setBarRevealedIds(prev => [...new Set([...prev, itemId])]);
                setDisplayedIds(prev => [...new Set([...prev, itemId])]);

                await wait(barMs);
                setActiveHighlightItem(null);
            }
            else if (eventType === 'sort_ranks') {
                console.log(`[Animation] Sorting Ranks`);
                setAnimationSortDuration(sortDurationMs / 1000);
                // Copy displayedIds to sortingIds to trigger reorder
                setSortingIds(prev => [...new Set([...barRevealedIds])]);
                await wait(sortDurationMs);
            }
            else if (eventType === 'reset') {
                console.log(`[Animation] Resetting display`);
                setBarRevealedIds([]);
                setDisplayedIds([]);
                setSortingIds([]);
            }

        } catch (err) {
            console.error('[Animation] Broadcast Event Error:', err);
        } finally {
            isAnimatingRef.current = false;
        }
    }, [audioEnabled, fetchDataSilent, barRevealedIds]);

    // Setup Realtime Listener
    useEffect(() => {
        // Initial fetch
        fetchDataSilent();

        // Listen to Broadcast from Admin Results Control
        const channel = supabase.channel('animation_control')
            .on('broadcast', { event: 'reveal_item' }, (payload) => handleBroadcastEvent(payload))
            .on('broadcast', { event: 'sort_ranks' }, (payload) => handleBroadcastEvent(payload))
            .on('broadcast', { event: 'reset' }, (payload) => handleBroadcastEvent(payload))
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Results] Subscribed to animation_control channel');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchDataSilent, handleBroadcastEvent]);

    const processedRankings = useMemo(() => {
        if (!settings || displayResults.length === 0) return [];

        const enabledItems = settings.evaluationItems.filter(item => item.enabled);

        return displayResults.map(res => {
            // Calculate breakdown based on judge scores
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
                    revealed: barRevealedIds.includes(item.id)
                };
            });

            // Audience score
            const audienceBreakdown = {
                id: 'audience',
                name: 'Audience',
                score: res.audienceWeightedScore,
                color: '#f87171',
                revealed: barRevealedIds.includes('audience')
            };

            const allItems = [...itemBreakdown, audienceBreakdown];

            // Score counter uses displayedIds
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
        }).sort((a, b) => b.sortingScore - a.sortingScore);
    }, [displayResults, settings, barRevealedIds, displayedIds, sortingIds]);

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
                        <motion.div
                            key={ANIMATION_STYLE} // Ensure re-render when style changes
                            variants={{
                                initial: { opacity: 0, scale: 0 },
                                animate: { opacity: 1, scale: [0, 1.25, 1], rotate: [0, -5, 0] },
                                exit: { opacity: 0, scale: 2, filter: 'blur(20px)' }
                            }}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.5 }}
                            className={`
                                font-black tracking-tighter leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] text-center px-4
                                ${LABEL_FONT_SIZE_CLASS}
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
                            animate={isActive ? { scale: 1.3, y: -5 } : { scale: 1, y: 0 }}
                            className={`flex items-center gap-2 transition-colors ${isActive ? 'text-[#fffa00]' : 'text-zinc-500'}`}
                        >
                            <div
                                className={`w-4 h-4 border-2 ${isActive ? 'border-[#fffa00] shadow-[0_0_10px_rgba(255,250,0,0.8)]' : 'border-zinc-500'}`}
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
                                            duration: BAR_TRANSITION_SPEED / 1000,
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
                                        duration={BAR_TRANSITION_SPEED}
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
