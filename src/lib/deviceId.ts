// ==============================
// 端末ID生成（不正投票防止用）
// Canvas + WebGL + Audio フィンガープリント
// ==============================

/**
 * Canvas フィンガープリントを生成
 */
function getCanvasFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';

        canvas.width = 200;
        canvas.height = 50;

        // テキストを描画
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('BMX Flatland 🚴', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('BMX Flatland 🚴', 4, 17);

        return canvas.toDataURL();
    } catch {
        return 'canvas-error';
    }
}

/**
 * WebGL フィンガープリントを生成
 */
function getWebGLFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no-webgl';

        const webgl = gl as WebGLRenderingContext;
        const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return 'no-debug-info';

        const vendor = webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

        return `${vendor}~${renderer}`;
    } catch {
        return 'webgl-error';
    }
}

/**
 * ブラウザ情報を収集
 */
function getBrowserInfo(): string {
    const info = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown',
    ];
    return info.join('|');
}

/**
 * 文字列をハッシュ化
 */
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(36);
}

/**
 * より強力なハッシュ（SHA-256ベース）
 */
async function sha256(message: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
        return hashString(message);
    }

    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * ローカルストレージからデバイスIDを取得または生成
 */
function getStoredDeviceId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        return localStorage.getItem('bmx_device_id');
    } catch {
        return null;
    }
}

/**
 * デバイスIDをローカルストレージに保存
 */
function storeDeviceId(deviceId: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('bmx_device_id', deviceId);
    } catch {
        // ストレージが使用できない場合は無視
    }
}

/**
 * Cookieからデバイスマーカーを取得
 */
function getCookieMarker(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/bmx_marker=([^;]+)/);
    return match ? match[1] : null;
}

/**
 * Cookieにデバイスマーカーを設定
 */
function setCookieMarker(marker: string): void {
    if (typeof document === 'undefined') return;
    // 30日間有効
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `bmx_marker=${marker}; expires=${expires}; path=/; SameSite=Strict`;
}

/**
 * 端末IDを生成
 * Canvas + WebGL + ブラウザ情報を組み合わせてユニークなIDを生成
 */
export async function generateDeviceId(): Promise<string> {
    // 既存のデバイスIDがあれば使用
    const storedId = getStoredDeviceId();
    const cookieMarker = getCookieMarker();

    if (storedId && cookieMarker && storedId.includes(cookieMarker.slice(0, 8))) {
        return storedId;
    }

    // フィンガープリントを収集
    const fingerprints = [
        getCanvasFingerprint(),
        getWebGLFingerprint(),
        getBrowserInfo(),
        Math.random().toString(36).slice(2), // ランダム要素
    ];

    const combined = fingerprints.join('###');
    const deviceId = await sha256(combined);

    // 保存
    storeDeviceId(deviceId);
    setCookieMarker(deviceId.slice(0, 16));

    return deviceId;
}

/**
 * 投票済みかどうかをチェック
 */
export function hasVotedForRider(riderId: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const votes = JSON.parse(localStorage.getItem('bmx_votes') || '{}');
        return !!votes[riderId];
    } catch {
        return false;
    }
}

/**
 * 投票を記録
 */
export function recordVote(riderId: string, score: number): void {
    if (typeof window === 'undefined') return;
    try {
        const votes = JSON.parse(localStorage.getItem('bmx_votes') || '{}');
        votes[riderId] = { score, timestamp: Date.now() };
        localStorage.setItem('bmx_votes', JSON.stringify(votes));
    } catch {
        // 無視
    }
}

/**
 * 投票記録を取得
 */
export function getVoteRecord(riderId: string): { score: number; timestamp: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const votes = JSON.parse(localStorage.getItem('bmx_votes') || '{}');
        return votes[riderId] || null;
    } catch {
        return null;
    }
}

/**
 * 変更可能期限内かをチェック
 */
export function canModifyVote(riderId: string, windowSeconds: number): boolean {
    const record = getVoteRecord(riderId);
    if (!record) return false;

    const elapsed = (Date.now() - record.timestamp) / 1000;
    return elapsed < windowSeconds;
}
