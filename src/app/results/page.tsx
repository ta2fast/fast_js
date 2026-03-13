'use client';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RiderResult,
    ContestSettings,
    DEFAULT_CONTEST_SETTINGS,
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
    const prevValue = useRef(0);

    useEffect(() => {
        let start = prevValue.current;
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
                prevValue.current = end;
            }
        };
        requestAnimationFrame(update);
    }, [value, duration]);

    return <span>{displayValue.toFixed(2)}</span>;
}

export default function ResultsPage() {
    const [displayResults, setDisplayResults] = useState<RiderResult[]>([]);
    const [settings, setSettings] = useState<ContestSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [revealingItem, setRevealingItem] = useState<string | null>(null);
    const [activeHighlightItem, setActiveHighlightItem] = useState<string | null>(null);
    const [barRevealedIds, setBarRevealedIds] = useState<string[]>([]);
    const [displayedIds, setDisplayedIds] = useState<string[]>([]);
    const [sortingIds, setSortingIds] = useState<string[]>([]);
    const [revealingRiderId, setRevealingRiderId] = useState<string | null>(null);
    const [announcedRiderIds, setAnnouncedRiderIds] = useState<string[]>([]);
    const [animationSortDuration, setAnimationSortDuration] = useState(0.8);
    const [animationSettings, setAnimationSettings] = useState(DEFAULT_ANIMATION_SETTINGS);

    const latestResultsRef = useRef<RiderResult[]>([]);
    const animationSettingsRef = useRef(DEFAULT_ANIMATION_SETTINGS);
    const isAnimatingRef = useRef(false);
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
            if (ctx.state === 'suspended') ctx.resume();
            const now = ctx.currentTime;
            const playTone = (freq: number, start: number, dur: number, vol: number) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.5, start + dur);
                g.gain.setValueAtTime(0, start);
                g.gain.linearRampToValueAtTime(vol, start + 0.02);
                g.gain.exponentialRampToValueAtTime(0.001, start + dur);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + dur);
            };
            playTone(880, now, 0.6, 0.1);
            playTone(1108, now + 0.05, 0.5, 0.07);
        } catch (e) { }
    };

    const enableAudio = () => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        ctx.resume().then(() => setAudioEnabled(true));
    };

    const [sortedRiderIds, setSortedRiderIds] = useState<string[]>([]);

    const fetchDataSilent = useCallback(async () => {
        const { data: settingsData } = await supabase.from('contest_settings').select('*').eq('id', 'default').single();
        let currentAnnounced: string[] = [];
        if (settingsData) {
            currentAnnounced = settingsData.announced_rider_ids || [];
            setSettings({
                ...DEFAULT_CONTEST_SETTINGS,
                ...settingsData,
                evaluationItems: settingsData.evaluation_items || DEFAULT_CONTEST_SETTINGS.evaluationItems,
                announcedRiderIds: currentAnnounced,
                currentTry: settingsData.current_try ?? 1,
            });
        }

        const res = await fetch('/api/scores', { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
            const currentResults = json.data as RiderResult[];
            latestResultsRef.current = currentResults;
            setAnnouncedRiderIds(currentAnnounced);
            // If we are in try 2 and some are announced, they might already be sorted in the DB/Logic
            // but for animation stability, we track them separately in sortedRiderIds
            if (initialLoadDone.current && (settingsData?.current_try ?? 1) === 2) {
                // Keep sortedIds in sync with announced unless we are in the middle of a reveal
            }

            if (!initialLoadDone.current) {
                initialLoadDone.current = true;
                setDisplayResults(currentResults);
                setLoading(false);
                if (settingsData?.current_try === 2) {
                    setSortedRiderIds(currentAnnounced);
                }
            } else {
                setDisplayResults(currentResults);
            }
        }
    }, []);

    const handleBroadcastEvent = useCallback(async (payload: any) => {
        if (isAnimatingRef.current) return;
        isAnimatingRef.current = true;
        await fetchDataSilent();

        const eventType = payload.event;
        const data = payload.payload;
        const barMs = animationSettingsRef.current.bar_transition_speed;
        const sortDurationMs = animationSettingsRef.current.sort_transition_speed;

        if (eventType === 'show_label') {
            const { itemName } = data;
            playRevealSound();
            setActiveHighlightItem(itemName);
            setRevealingItem(itemName);
        }
        else if (eventType === 'hide_label') {
            setRevealingItem(null);
        }
        else if (eventType === 'reveal_score') {
            const { itemId } = data;
            setRevealingItem(null);
            const newIds = [...new Set([...barRevealedIds, itemId])];
            setBarRevealedIds(newIds);
            setDisplayedIds(newIds);
            await wait(barMs);
        }
        else if (eventType === 'reveal_rider_2nd_try') {
            const { riderId } = data;
            setRevealingItem(null);
            await fetchDataSilent();
            setRevealingRiderId(riderId);
            playRevealSound();
            await wait(barMs + 500);
            setAnnouncedRiderIds(prev => [...new Set([...prev, riderId])]);
            // Keep revealingRiderId set until sort_ranks
        }
        else if (eventType === 'sort_ranks') {
            setAnimationSortDuration(sortDurationMs / 1000);
            if (settings?.currentTry === 1) {
                setSortingIds([...barRevealedIds]);
            } else {
                setSortedRiderIds([...announcedRiderIds]);
            }
            await wait(sortDurationMs);
            setActiveHighlightItem(null);
            setRevealingRiderId(null); // Clear highlight after sort
        }
        else if (eventType === 'reset') {
            setBarRevealedIds([]);
            setDisplayedIds([]);
            setSortingIds([]);
            setAnnouncedRiderIds([]);
            setSortedRiderIds([]);
            setRevealingRiderId(null);
            if (data?.reloadSettings) {
                const { data: animData } = await supabase.from('animation_settings').select('*').eq('id', 1).single();
                if (animData) {
                    const newAnim = { ...DEFAULT_ANIMATION_SETTINGS, ...animData };
                    setAnimationSettings(newAnim);
                    animationSettingsRef.current = newAnim;
                }
            }
        }
        isAnimatingRef.current = false;
    }, [fetchDataSilent, barRevealedIds, announcedRiderIds, settings?.currentTry]);

    useEffect(() => {
        fetchDataSilent();
        const channel = supabase.channel('animation_control')
            .on('broadcast', { event: 'show_label' }, (p) => handleBroadcastEvent(p))
            .on('broadcast', { event: 'hide_label' }, (p) => handleBroadcastEvent(p))
            .on('broadcast', { event: 'reveal_score' }, (p) => handleBroadcastEvent(p))
            .on('broadcast', { event: 'reveal_rider_2nd_try' }, (p) => handleBroadcastEvent(p))
            .on('broadcast', { event: 'sort_ranks' }, (p) => handleBroadcastEvent(p))
            .on('broadcast', { event: 'reset' }, (p) => handleBroadcastEvent(p))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchDataSilent, handleBroadcastEvent]);

    const anyRiderRevealing = revealingRiderId !== null;

    const processedRankings = useMemo(() => {
        if (!settings || displayResults.length === 0) return [];
        const enabledItems = settings.evaluationItems.filter(i => i.enabled).sort((a, b) => a.order - b.order);

        const items = displayResults.map(res => {
            const getBreakdownForTry = (tryNum: number) => {
                const tryScores = res.judgeScores.filter(s => s.tryNumber === tryNum);
                return enabledItems.map((item, index) => {
                    const sAcross = tryScores.map(js => (js.scores.find(is => is.itemId === item.id)?.score || 0) * item.weight);
                    const avg = sAcross.length ? sAcross.reduce((a, b) => a + b, 0) / sAcross.length : 0;
                    return {
                        id: item.id,
                        name: item.name,
                        score: avg,
                        color: OUTDOOR_COLORS[index % OUTDOOR_COLORS.length],
                        revealed: settings.currentTry === 1 ? barRevealedIds.includes(item.id) : true
                    };
                });
            };

            const try1Items = getBreakdownForTry(1);
            const try2Items = getBreakdownForTry(2);

            // Audience score is handled separately in this schema but we can include it in breakdowns if needed
            // For now let's focus on the evaluation items as colorful bars
            const try1Total = res.try1Total || 0;
            const try2Total = res.try2Total || 0;

            const isRevealing2nd = revealingRiderId === res.rider.id;
            const isAnnounced2nd = announcedRiderIds.includes(res.rider.id);

            // For Sorting Score
            let sortingScore = 0;
            if (settings.currentTry === 1) {
                // Sum of currently revealed items in Try 1
                sortingScore = try1Items.filter(i => sortingIds.includes(i.id)).reduce((a, b) => a + b.score, 0);
            } else {
                // For 2nd try ranking: only use best score if rider is in sortedRiderIds
                sortingScore = sortedRiderIds.includes(res.rider.id) ? res.totalScore : try1Total;
            }

            const currentRevealedScore = settings.currentTry === 1
                ? try1Items.filter(i => displayedIds.includes(i.id)).reduce((a, b) => a + b.score, 0)
                : (isRevealing2nd ? try2Total : (isAnnounced2nd ? res.totalScore : try1Total));

            return {
                ...res,
                try1Items,
                try2Items,
                try1Total,
                try2Total,
                try1Score: try1Total, // Restoring for compatibility if needed elsewhere
                try2Score: try2Total, // Restoring for compatibility if needed elsewhere
                isRevealing2nd,
                isAnnounced2nd,
                sortingScore,
                currentRevealedScore
            };
        });

        const sorted = items.sort((a, b) => ((b.sortingScore || 0) - (a.sortingScore || 0)) || (a.rider.displayOrder - b.rider.displayOrder));
        let curRank = 1;
        return sorted.map((res, i) => {
            if (i > 0 && (res.sortingScore || 0) < (sorted[i - 1].sortingScore || 0)) curRank = i + 1;
            return { ...res, calculatedRank: curRank };
        });
    }, [displayResults, settings, barRevealedIds, displayedIds, sortingIds, revealingRiderId, announcedRiderIds]);

    if (loading || !settings) return <div className="min-h-screen flex items-center justify-center bg-black text-white italic">LOADING...</div>;

    const maxPoints = 125; // Example max

    return (
        <div className="h-screen w-screen bg-black text-white p-4 uppercase overflow-hidden flex flex-col relative font-sans">
            <AnimatePresence>
                {!audioEnabled && (
                    <motion.div exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-pointer" onClick={enableAudio}>
                        <div className="bg-[#fffa00] text-black px-12 py-6 rounded-full text-3xl font-black shadow-[0_0_50px_#fffa00]">CLICK TO START</div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {revealingItem && (
                    <motion.div key={revealingItem} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }} className="fixed inset-0 z-[60] flex items-center justify-center font-black text-white text-9xl text-center px-4 drop-shadow-[0_0_30px_rgba(255,255,255,1)]">
                        {revealingItem}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Legend */}
            <div className="flex justify-end gap-x-8 mb-6 opacity-70 border-b border-white/20 pb-4 h-12 items-end">
                {settings.evaluationItems.filter(i => i.enabled).map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: OUTDOOR_COLORS[i % OUTDOOR_COLORS.length] }} />
                        <span className="text-xs font-black">{item.name}</span>
                    </div>
                ))}
            </div>

            <div className="flex-1 flex flex-col gap-3 min-h-0">
                <AnimatePresence mode="popLayout" initial={false}>
                    {processedRankings.map((res) => (
                        <motion.div
                            key={res.rider.id}
                            layout
                            initial={false}
                            animate={{
                                scale: res.isRevealing2nd ? 1.05 : 1,
                                opacity: (anyRiderRevealing && !res.isRevealing2nd) ? 0.4 : 1,
                                filter: (anyRiderRevealing && !res.isRevealing2nd) ? 'grayscale(80%)' : 'grayscale(0%)',
                                zIndex: res.isRevealing2nd ? 50 : 0
                            }}
                            transition={{ duration: animationSortDuration, ease: "easeInOut" }}
                            className="relative flex items-center gap-4 py-3 bg-zinc-900/60 rounded-xl pr-6 border-l-[16px] shadow-xl"
                            style={{ borderLeftColor: res.calculatedRank === 1 ? '#fffa00' : res.calculatedRank === 2 ? '#e2e8f0' : res.calculatedRank === 3 ? '#b45309' : '#333' }}
                        >
                            {/* Rank & Name */}
                            <div className="w-[30%] flex items-center gap-6 pl-6">
                                <span className={`text-6xl font-black italic ${res.calculatedRank === 1 ? 'text-[#fffa00]' : 'text-zinc-500'}`}>{res.calculatedRank}</span>
                                <span className="text-3xl font-black truncate tracking-tighter">{res.rider.riderName}</span>
                            </div>

                            {/* Main Bar Section */}
                            <div className="flex-1">
                                <div className="bg-black/50 h-14 relative overflow-hidden flex rounded-sm">
                                    {settings.currentTry === 1 ? (
                                        // Try 1 Mode: Show segments
                                        res.try1Items.map(item => (
                                            <motion.div
                                                key={item.id}
                                                animate={{ width: item.revealed ? `${(item.score / maxPoints) * 100}%` : '0%' }}
                                                transition={{ duration: animationSettings.bar_transition_speed / 1000 }}
                                                style={{ backgroundColor: item.color }}
                                                className="h-full"
                                            />
                                        ))
                                    ) : (
                                        // Try 2 Mode: Best of Two Flow with colorful bars
                                        <div className="relative w-full h-full flex">
                                            {/* Colorful Bar Rendering */}
                                            {(res.isRevealing2nd ? res.try2Items : (res.isAnnounced2nd && res.try2Total > res.try1Total ? res.try2Items : res.try1Items)).map((item: any) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={res.isRevealing2nd ? { width: 0 } : false}
                                                    animate={{ width: `${(item.score / maxPoints) * 100}%` }}
                                                    transition={{ duration: animationSettings.bar_transition_speed / 1000 }}
                                                    style={{ backgroundColor: item.color }}
                                                    className="h-full"
                                                />
                                            ))}

                                            {/* If revealing 2nd, show Try 1 result as a ghosted background or a small indicator?
                                                Actually, the requirement says "1stランの結果を残しつつ新しく2ndランの結果を描画".
                                                Let's overlay a marker or ghost bar for Try 1. */}
                                            {res.isRevealing2nd && (
                                                <div className="absolute inset-0 border-r-4 border-blue-500/50 pointer-events-none" style={{ width: `${(res.try1Total / maxPoints) * 100}%` }}>
                                                    <div className="absolute top-0 right-0 bg-blue-500/50 text-[10px] px-1 font-black -translate-y-full">TRY1</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Score Display */}
                            <div className="w-48 text-right">
                                <div className="text-6xl font-black text-[#fffa00] tabular-nums tracking-tighter">
                                    <AnimatedCounter
                                        value={res.currentRevealedScore}
                                        duration={animationSettings.bar_transition_speed}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
