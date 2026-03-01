'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JudgeRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        const storedJudgeId = localStorage.getItem('fast_judge_id');
        if (storedJudgeId) {
            router.replace('/judge/main');
        } else {
            router.replace('/judge/login');
        }
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
            <div className="text-xl animate-pulse">読み込み中...</div>
        </div>
    );
}
