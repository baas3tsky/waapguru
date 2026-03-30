import { NextResponse } from 'next/server';
import { exportReport } from '@/lib/actions/export-service';
import { ReportData, ExportFormat } from '@/types/report';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportData, format } = body as { reportData: ReportData; format: ExportFormat };

    if (!reportData || !format) {
      return NextResponse.json(
        { error: 'Missing required fields: reportData or format' },
        { status: 400 }
      );
    }

    const result = await exportReport(reportData, format);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Export API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
