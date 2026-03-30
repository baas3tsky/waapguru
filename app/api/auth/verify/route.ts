/**
 * Email Verification API Route
 * Verifies email token and creates session
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { SignJWT } from 'jose';
import { JWT_SECRET, SESSION_COOKIE_NAME, MAX_AGE } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // Support both 'token' and 'code' parameters
  const token = searchParams.get('code') || searchParams.get('token');
  const email = searchParams.get('email');

  logger.info('Verification request received:', { 
    email, 
    hasToken: !!token, 
    url: request.url,
    params: Object.fromEntries(searchParams.entries())
  });

  if (!token || !email) {
    const missing = [];
    if (!token) missing.push('code');
    if (!email) missing.push('email');
    logger.error('Verification request missing params:', { url: request.url, missing });
    return NextResponse.redirect(new URL(`/login?error=missing-params-${missing.join('-')}`, request.url));
  }

  try {
    // Get access token
    const { getAccessToken } = await import('@/lib/graph-client');
    const accessToken = await getAccessToken();

    // Verify token
    const { verifyEmailToken } = await import('@/lib/actions/sharepoint-user-service');
    const result = await verifyEmailToken(accessToken, email, token);

    if (!result.success || !result.user) {
      logger.error('Email verification failed:', result.error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(result.error || 'Verification failed')}`, request.url)
      );
    }

    // Create session token
    const sessionToken = await new SignJWT({
      email: result.user.email,
      id: result.user.id,
      fullName: result.user.fullName,
      emailVerified: true
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Create response with redirect
    const response = NextResponse.redirect(new URL('/dashboard?verified=true', request.url));

    // Set session cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/'
    });

    logger.info('User verified and logged in:', { email: result.user.email });

    return response;

  } catch (error) {
    logger.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
