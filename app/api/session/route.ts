/**
 * Session API Route
 * Returns current user session
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/actions/auth-actions';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: session.id as string,
        email: session.email as string,
        fullName: session.fullName as string
      }
    });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
