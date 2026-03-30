"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { jwtVerify } from "jose";
import { JWT_SECRET, SESSION_COOKIE_NAME } from "@/lib/auth-utils";
import crypto from 'crypto';

/**
 * Verify JWT session token
 */
export async function verifySessionToken(token: string) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (error) {
    logger.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Get current session from cookie
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  return await verifySessionToken(token);
}

/**
 * Sign out user
 */
export async function signout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Send verification email (login)
 */
export async function sendVerificationEmail(formData: FormData) {
  const rawEmail = formData.get("email") as string;
  const email = rawEmail ? rawEmail.toLowerCase().trim() : '';
  const fullName = formData.get("full-name") as string || email.split('@')[0];

  if (!email) {
    return { error: "กรุณากรอกอีเมล" };
  }

  try {
    // Validate email domain
    const { validateEmailAndDomain } = await import("@/lib/utils/domain-validation");
    const validation = validateEmailAndDomain(email);
    
    if (!validation.isValid) {
      return { error: validation.error || "อีเมลไม่ถูกต้อง" };
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + parseInt(process.env.VERIFICATION_TOKEN_EXPIRY || '3600000')).toISOString();

    if (!verificationToken) {
      logger.error('Failed to generate verification token');
      return { error: "Internal error: Failed to generate token" };
    }

    // Get SharePoint access token
    const { getAccessToken } = await import("@/lib/graph-client");
    const accessToken = await getAccessToken();

    // Create or update user with token
    const { createUserWithToken } = await import("./sharepoint-user-service");
    const result = await createUserWithToken(accessToken, email, fullName, verificationToken, tokenExpiry);

    if (!result.success) {
      logger.error("Failed to create verification token:", result.error);
      return { error: result.error || "ไม่สามารถสร้าง verification token ได้" };
    }

    // Send verification email
    const { sendEmail } = await import("./email-service");
    
    // Determine base URL with Vercel support
    // Priority:
    // 1. NEXT_PUBLIC_SITE_URL (User configured, best for custom domains)
    // 2. VERCEL_PROJECT_PRODUCTION_URL (Auto-generated production URL by Vercel)
    // 3. VERCEL_URL (Current deployment URL, might be protected/preview)
    // 4. Localhost fallback
    
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

    // Helper to cleanup URL (remove trailing slash)
    const cleanUrl = (url?: string) => url?.replace(/\/$/, '');

    // If NEXT_PUBLIC_SITE_URL is not set or is localhost, verify if we have better options
    if (!baseUrl || baseUrl.includes('localhost')) {
      if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
      } else if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      }
    }

    // Final fallback
    if (!baseUrl) {
      baseUrl = 'http://localhost:3000';
    }
    
    baseUrl = cleanUrl(baseUrl) || 'http://localhost:3000';

    console.log('🔗 Generating verification link with base URL:', baseUrl);

    // Construct URL safely using URL object
    // Use 'code' instead of 'token' to avoid potential filtering issues
    const url = new URL('/api/auth/verify', baseUrl);
    url.searchParams.set('code', verificationToken);
    url.searchParams.set('email', email);
    const verificationUrl = url.toString();
    
    logger.info('Generated verification URL:', { 
      baseUrl, 
      verificationUrl,
      tokenLength: verificationToken.length
    });
    
    const emailResult = await sendEmail({
      to: email,
      subject: "Verify your email - Support Ticket System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email</h2>
          <p>Hello ${fullName},</p>
          <p>Click the link below to verify your email and sign in to Support Ticket System:</p>
          <p style="margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email & Sign In
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    });

    if (!emailResult.success) {
      logger.error("Failed to send verification email:", emailResult.error);
      return { error: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง" };
    }

    logger.info("Verification email sent to:", email);
    return { success: true, message: "กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันและเข้าสู่ระบบ" };
    
  } catch (error) {
    logger.error("Send verification email error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: `เกิดข้อผิดพลาด: ${errorMessage}` };
  }
}