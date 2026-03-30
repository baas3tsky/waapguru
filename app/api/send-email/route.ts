import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/actions/email-service';

/**
 * Email API Route
 * ส่ง email ผ่าน Resend API
 */
export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json();

    // Validate input
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and content' },
        { status: 400 }
      );
    }

    // ส่งอีเมลผ่าน Resend
    const result = await sendEmail({
      to,
      subject,
      html,
      text
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Email sent successfully to ${to}`,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
