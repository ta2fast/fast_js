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

const DEFAULT_ANIMATION_SETTINGS = {
    label_display_time: 3000,
    bar_transition_speed: 2000,
    sort_delay_time: 3000,
    sort_transition_speed: 1500,
    animation_style: 'Pop-in',
    label_font_size: 'text-8xl md:text-[12vw]',
    label_transition_speed: 500
};

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
    const [animationSettings, setAnimationSettings] = useState(DEFAULT_ANIMATION_SETTINGS);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const latestResultsRef = useRef<RiderResult[]>([]);
    const animationSettingsRef = useRef(DEFAULT_ANIMATION_SETTINGS);

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
            console.error('[Audio] Setup Error:', e);
        }
    };

    const toggleFullscreen = () => {
        const doc = document as any;
        const elem = document.documentElement as any;

        if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            if (doc.exitFullscreen) {
                doc.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
                doc.webkitExitFullscreen();
            } else if (doc.mozCancelFullScreen) {
                doc.mozCancelFullScreen();
            } else if (doc.msExitFullscreen) {
                doc.msExitFullscreen();
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as any;
            setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

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



    const fetchContestSettings = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('contest_settings').select('*').eq('id', 'default').single();
            if (data && !error) {
                setSettings({
                    ...DEFAULT_CONTEST_SETTINGS,
                    ...data,
                    evaluationItems: data.evaluation_items || DEFAULT_CONTEST_SETTINGS.evaluationItems,
                });
            }
        } catch (err) {
            console.error('[Results] Failed to fetch contest settings', err);
        }
    }, []);

    // === Fetch data WITHOUT updating display (background sync) ===
    const fetchDataSilent = useCallback(async () => {
        try {
            // Fetch settings alongside scores
            await fetchContestSettings();

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
    }, [fetchContestSettings]);

    const fetchAnimationSettings = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('animation_settings').select('*').eq('id', 1).single();
            if (data && !error) {
                const newSettings = {
                    label_display_time: Number(data.label_display_time) ?? DEFAULT_ANIMATION_SETTINGS.label_display_time,
                    bar_transition_speed: Number(data.bar_transition_speed) ?? DEFAULT_ANIMATION_SETTINGS.bar_transition_speed,
                    sort_delay_time: Number(data.sort_delay_time) ?? DEFAULT_ANIMATION_SETTINGS.sort_delay_time,
                    sort_transition_speed: Number(data.sort_transition_speed) ?? DEFAULT_ANIMATION_SETTINGS.sort_transition_speed,
                    animation_style: data.animation_style || DEFAULT_ANIMATION_SETTINGS.animation_style,
                    label_font_size: data.label_font_size || DEFAULT_ANIMATION_SETTINGS.label_font_size,
                    label_transition_speed: DEFAULT_ANIMATION_SETTINGS.label_transition_speed,
                };
                setAnimationSettings(newSettings);
                animationSettingsRef.current = newSettings;
            }
        } catch (err) {
            console.error('[Results] Failed to fetch animation settings', err);
        }
    }, []);

    // Load Animation Settings once on mount
    useEffect(() => {
        fetchAnimationSettings();
    }, [fetchAnimationSettings]);

    // === Handle Broadcast Action ===
    const handleBroadcastEvent = useCallback(async (payload: any) => {
        if (isAnimatingRef.current) return;

        try {
            isAnimatingRef.current = true;
            // Force data refresh before animation
            await fetchDataSilent();

            const eventType = payload.event;
            const data = payload.payload;

            const labelMs = animationSettingsRef.current.label_display_time;
            const barMs = animationSettingsRef.current.bar_transition_speed;
            const sortDelayMs = animationSettingsRef.current.sort_delay_time;
            const sortDurationMs = animationSettingsRef.current.sort_transition_speed;

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
                const newRevealedIds = [...new Set([...barRevealedIds, itemId])];
                setBarRevealedIds(newRevealedIds);
                setDisplayedIds(newRevealedIds);

                await wait(barMs);

                // --- 自動順位入れ替え (Auto Sort) ---
                console.log(`[Animation] Auto-Sort Wait (${sortDelayMs}ms)`);
                await wait(sortDelayMs);

                // 順位確定前に最新の合計点を再取得・計算させる
                await fetchDataSilent();

                console.log(`[Animation] Auto-Sorting Ranks (${sortDurationMs}ms)`);
                setAnimationSortDuration(sortDurationMs / 1000);
                setSortingIds(newRevealedIds);
                await wait(sortDurationMs);

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

                // If the reset came from the settings page, reload the settings
                if (data?.reloadSettings) {
                    console.log(`[Animation] Reloading settings from database`);
                    await fetchAnimationSettings();
                }
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

        const enabledItems = settings.evaluationItems
            .filter(item => item.enabled)
            .sort((a, b) => a.order - b.order);

        const items = displayResults.map(res => {
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
        });

        const sorted = items.sort((a, b) => {
            if (b.sortingScore !== a.sortingScore) {
                return b.sortingScore - a.sortingScore;
            }
            return a.rider.displayOrder - b.rider.displayOrder;
        });

        // Calculate ranks with ties
        let currentRank = 1;
        return sorted.map((res, index) => {
            if (index > 0 && res.sortingScore < sorted[index - 1].sortingScore) {
                currentRank = index + 1;
            }
            return {
                ...res,
                calculatedRank: currentRank
            };
        });
    }, [displayResults, settings, barRevealedIds, displayedIds, sortingIds]);

    if (loading || !settings) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
                <div className="text-4xl font-bold animate-pulse tracking-widest italic">LOADING RESULTS...</div>
            </div>
        );
    }

    const enabledItems = settings.evaluationItems
        .filter(item => item.enabled)
        .sort((a, b) => a.order - b.order);

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
                            key={animationSettings.animation_style} // Ensure re-render when style changes
                            variants={
                                animationSettings.animation_style === 'Fade'
                                    ? {
                                        initial: { opacity: 0 },
                                        animate: { opacity: 1 },
                                        exit: { opacity: 0 }
                                    }
                                    : animationSettings.animation_style === 'Slide'
                                        ? {
                                            initial: { opacity: 0, x: -100 },
                                            animate: { opacity: 1, x: 0 },
                                            exit: { opacity: 0, x: 100 }
                                        }
                                        : { // Default Pop-in
                                            initial: { opacity: 0, scale: 0 },
                                            animate: { opacity: 1, scale: [0, 1.25, 1], rotate: [0, -5, 0] },
                                            exit: { opacity: 0, scale: 2, filter: 'blur(20px)' }
                                        }
                            }
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: animationSettings.label_transition_speed / 1000 }}
                            className={`
                                font-black tracking-tighter leading-none text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] text-center px-4
                                ${animationSettings.label_font_size}
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
                                layout: { type: 'tween', ease: 'easeInOut', duration: animationSortDuration },
                                opacity: { duration: 0.3 }
                            }}
                            className={`relative flex items-center gap-4 ${res.calculatedRank <= 3 ? 'flex-[1.3] py-2 md:py-3' : 'flex-1 py-1 md:py-2'} min-h-0 bg-zinc-900/40 rounded-lg pr-4 border-l-[12px] ${res.calculatedRank <= 3 ? 'shadow-[0_0_20px_rgba(255,250,0,0.2)]' : ''}`}
                            style={{
                                borderLeftColor: res.calculatedRank === 1 ? '#fffa00' : res.calculatedRank === 2 ? '#e2e8f0' : res.calculatedRank === 3 ? '#b45309' : '#333'
                            }}
                        >
                            {/* Rank & Name */}
                            <div className="w-[160px] md:w-[300px] flex items-center gap-3 shrink-0 pl-4">
                                <motion.div
                                    className={`${res.calculatedRank <= 3 ? 'text-4xl md:text-6xl w-14 md:w-24' : 'text-3xl md:text-4xl w-10 md:w-16'} font-bold shrink-0 ${res.calculatedRank === 1 ? 'text-[#fffa00] drop-shadow-[0_0_10px_rgba(255,250,0,0.8)]' :
                                        res.calculatedRank === 2 ? 'text-[#e2e8f0] drop-shadow-[0_0_10px_rgba(226,232,240,0.8)]' :
                                            res.calculatedRank === 3 ? 'text-[#b45309] drop-shadow-[0_0_10px_rgba(180,83,9,0.8)]' :
                                                'text-zinc-600'
                                        }`}
                                >
                                    {res.calculatedRank}
                                </motion.div>
                                <div className="flex flex-col min-w-0">
                                    <span className={`${res.calculatedRank <= 3 ? 'text-xl md:text-3xl' : 'text-lg md:text-xl'} text-white truncate font-black tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}>{res.rider.riderName}</span>
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
                                            duration: animationSettings.bar_transition_speed / 1000,
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
                                <div className={`${res.calculatedRank <= 3 ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl'} font-bold tracking-tight text-[#fffa00] drop-shadow-[0_0_10px_rgba(255,250,0,0.5)]`}>
                                    <AnimatedCounter
                                        value={res.currentDisplayedScore}
                                        duration={animationSettingsRef.current.bar_transition_speed}
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

            {/* Fullscreen Toggle Button */}
            <button
                onClick={toggleFullscreen}
                className="fixed bottom-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all opacity-40 hover:opacity-100 group"
                title={isFullscreen ? "全画面解除" : "全画面表示"}
            >
                {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                )}
            </button>
        </div>
    );
}
