/**
 * Authentication utilities and constants
 * Non-server functions and constants for auth
 */

import { SignJWT } from "jose";

// JWT Secret from environment
export const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production"
);

export const SESSION_COOKIE_NAME = "session-token";
export const MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Create JWT session token
 */
export async function createSessionToken(user: { 
  id: string; 
  email: string; 
  fullName: string 
}) {
  const token = await new SignJWT({ 
    userId: user.id,
    email: user.email,
    name: user.fullName
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}
