import { NextResponse } from 'next/server';
import { getReportData } from '@/lib/actions/report-service';
import { ReportFilters } from '@/types/report';

export async function POST(request: Request) {
  try {
    const filters = await request.json() as ReportFilters;

    if (!filters || !filters.dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields: filters' },
        { status: 400 }
      );
    }

    const data = await getReportData(filters);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Report Data API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
