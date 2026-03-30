import { NextResponse, NextRequest } from 'next/server';
import { checkAndSendSlaWarnings } from '@/lib/actions/ticket-actions';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(request: NextRequest) {
  try {
    // Security check: Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('⏰ Starting scheduled SLA check...');
    const result = await checkAndSendSlaWarnings();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'SLA check completed successfully',
        stats: {
          processed: result.processedTickets,
          warningsSent: result.warningsSent
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'SLA check failed',
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Error in SLA check cron job:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
