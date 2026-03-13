// ==============================
// データストア（サーバーサイド）
// Supabaseを使用
// ==============================

// Supabaseストアから全ての関数をエクスポート
export {
    // Riders
    getRiders,
    getRider,
    createRider,
    updateRider,
    deleteRider,
    reorderRiders,

    // Judge Scores
    getJudgeScores,
    getJudgeScoresForRider,
    getJudgeScoresByJudge,
    getJudgeScore,
    hasJudgeScored,
    submitJudgeScore,

    // Audience Votes
    getAudienceVotes,
    getAudienceVotesForRider,
    hasDeviceVoted,
    getDeviceVote,
    submitAudienceVote,

    // Contest Settings
    getSettings,
    updateSettings,
    setVotingEnabled,

    // Judges
    getJudges,
    createJudge,
    updateJudge,
    deleteJudge,
    ensureJudgeExists,

    // Logs
    getLogs,

    // CSV Export
    exportToCSV,

    // Initialize
    initializeStore,

    // Judge Sessions
    getJudgeSessions,
    occupyJudgeSeat,
    releaseJudgeSeat,

    // Reset
    resetRevelations,
    revealRiderTry,
    resetContestData,
    resetAllJudgeSessions,
    resetScoresAndVotes,
} from './supabaseStore';
