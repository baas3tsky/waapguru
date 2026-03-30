/**
 * Domain validation utility
 * ตรวจสอบว่า email เป็นของ domain ที่อนุญาตหรือไม่
 */

const ALLOWED_DOMAIN = 'ruthvictor.com';

/**
 * ตรวจสอบว่า email อยู่ใน whitelist domain หรือไม่
 */
export function isAllowedDomain(email: string): boolean {
  if (!email) return false;
  
  const emailDomain = email.toLowerCase().split('@')[1];
  return emailDomain === ALLOWED_DOMAIN;
}

/**
 * ดึง domain จาก email
 */
export function extractDomain(email: string): string {
  if (!email) return '';
  return email.toLowerCase().split('@')[1] || '';
}

/**
 * ตรวจสอบรูปแบบ email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email และ domain พร้อมกัน
 */
export function validateEmailAndDomain(email: string): {
  isValid: boolean;
  error?: string;
} {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!isValidEmail(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (!isAllowedDomain(email)) {
    return { 
      isValid: false, 
      error: `Only @${ALLOWED_DOMAIN} emails are allowed` 
    };
  }

  return { isValid: true };
}
