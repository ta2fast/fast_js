// ==============================
// Export API (CSV)
// ==============================

import { NextRequest, NextResponse } from 'next/server';
import { exportToCSV } from '@/lib/store';

export const dynamic = 'force-dynamic';

// GET /api/admin/export - CSVエクスポート
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'all';

        const csvData = await exportToCSV();

        let content: string;
        let filename: string;

        switch (type) {
            case 'riders':
                content = csvData.riders;
                filename = 'riders.csv';
                break;
            case 'judge_scores':
                content = csvData.judgeScores;
                filename = 'judge_scores.csv';
                break;
            case 'audience_votes':
                content = csvData.audienceVotes;
                filename = 'audience_votes.csv';
                break;
            case 'results':
                content = csvData.results;
                filename = 'results.csv';
                break;
            default:
                // 全データをまとめて返す
                content = [
                    '=== 選手データ ===',
                    csvData.riders,
                    '',
                    '=== ジャッジスコア ===',
                    csvData.judgeScores,
                    '',
                    '=== 観客投票 ===',
                    csvData.audienceVotes,
                    '',
                    '=== 結果 ===',
                    csvData.results,
                ].join('\n');
                filename = 'all_data.csv';
        }

        // BOM付きUTF-8でエンコード（Excelで文字化けしないように）
        const bom = '\uFEFF';
        const blob = bom + content;

        return new NextResponse(blob, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
