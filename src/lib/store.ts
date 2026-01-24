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

    // Judge Scores
    getJudgeScores,
    getJudgeScoresForRider,
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

    // Logs
    getLogs,

    // CSV Export
    exportToCSV,

    // Initialize
    initializeStore,
} from './supabaseStore';
