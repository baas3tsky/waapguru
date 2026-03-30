/**
 * SharePoint User Service
 * Manages user authentication with SharePoint Lists via Google OAuth
 */

import { getListItems, createListItem, getSharePointListId } from '@/lib/graph-client'
import { logger } from '@/lib/logger'

const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID!
const USERS_LIST_NAME = 'Users'

let USERS_LIST_ID: string | null = null

export interface User {
  id: string
  email: string
  fullName: string
  lastLoginDate?: string
  createdAt: string
  googleId?: string
  emailVerified?: boolean
  profilePicture?: string
}

interface SharePointUser {
  id: string
  createdDateTime?: string // SharePoint metadata field
  lastModifiedDateTime?: string
  fields: {
    Title: string // Email
    FullName: string
    LastLoginDate?: string
    GoogleId?: string
    EmailVerified?: boolean
    ProfilePicture?: string
    VerificationToken?: string
    TokenExpiry?: string
  }
}

/**
 * Initialize service - get Users list ID
 */
async function init(accessToken: string): Promise<void> {
  if (USERS_LIST_ID) return
  
  try {
    logger.info('Initializing SharePoint User Service, getting list ID for:', USERS_LIST_NAME)
    USERS_LIST_ID = await getSharePointListId(accessToken, SHAREPOINT_SITE_ID, USERS_LIST_NAME)
    
    if (!USERS_LIST_ID) {
      logger.error('Users list not found in SharePoint')
      throw new Error('Users list not found in SharePoint. Please run setup-sharepoint-lists.ps1 first.')
    }
    
    logger.info('SharePoint User Service initialized successfully, list ID:', USERS_LIST_ID)
  } catch (error) {
    logger.error('Failed to initialize SharePoint User Service:', error)
    throw error
  }
}

/**
 * Map SharePoint item to User type
 */
function mapSharePointItemToUser(item: SharePointUser): User {
  const fields = item.fields
  
  return {
    id: item.id,
    email: fields.Title,
    fullName: fields.FullName,
    lastLoginDate: fields.LastLoginDate,
    createdAt: item.createdDateTime || new Date().toISOString(), // Use SharePoint metadata field
    googleId: fields.GoogleId,
    emailVerified: fields.EmailVerified,
    profilePicture: fields.ProfilePicture,
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail(
  accessToken: string,
  email: string
): Promise<User | null> {
  try {
    await init(accessToken)
    
    const result = await getListItems<SharePointUser>(
      accessToken,
      SHAREPOINT_SITE_ID,
      USERS_LIST_ID!,
      {
        filter: `fields/Title eq '${email}'`,
        expand: ['fields'],
        select: ['id', 'createdDateTime', 'lastModifiedDateTime', 'fields'],
        top: 1
      }
    )
    
    if (!result.success || result.data.length === 0) {
      return null
    }
    
    return mapSharePointItemToUser(result.data[0])
  } catch (error) {
    logger.error('Error finding user by email:', error)
    return null
  }
}

/**
 * Create new user (deprecated - use Google OAuth)
 */
export async function createUser(
  accessToken: string,
  userData: {
    email: string
    password: string
    fullName: string
  }
): Promise<{ success: boolean; user?: User; error?: string }> {
  return { 
    success: false, 
    error: 'Please use Google OAuth to sign up. Only @ruthvictor.com emails are allowed.' 
  }
}

/**
 * Authenticate user (deprecated - use Google OAuth)
 */
export async function authenticateUser(
  accessToken: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  return { 
    success: false, 
    error: 'Please use Google OAuth to sign in. Only @ruthvictor.com emails are allowed.' 
  }
}

/**
 * Update user password (deprecated - use Google OAuth)
 */
export async function updateUserPassword(
  accessToken: string,
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  return { 
    success: false, 
    error: 'Password management is not available. Use Google OAuth for authentication.' 
  }
}

/**
 * Find or create user from Google OAuth (deprecated - use email verification)
 */
export async function findOrCreateGoogleUser(
  accessToken: string,
  googleData: {
    googleId: string
    email: string
    fullName: string
    emailVerified: boolean
    profilePicture?: string
  }
): Promise<{ success: boolean; user?: User; error?: string }> {
  return { 
    success: false, 
    error: 'Google OAuth is no longer supported. Please use email verification.' 
  };
}

/**
 * Create or update user with verification token
 */
export async function createUserWithToken(
  accessToken: string,
  email: string,
  fullName: string,
  verificationToken: string,
  tokenExpiry: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await init(accessToken);
    
    // Check if user exists
    const existingUser = await findUserByEmail(accessToken, email);
    
    if (existingUser) {
      // Update existing user with new token
      const { updateListItem } = await import('@/lib/graph-client');
      const updateResult = await updateListItem(
        accessToken,
        SHAREPOINT_SITE_ID,
        USERS_LIST_ID!,
        existingUser.id,
        {
          VerificationToken: verificationToken,
          TokenExpiry: tokenExpiry
        }
      );
      
      if (!updateResult.success) {
        return { success: false, error: 'Failed to update verification token' };
      }
    } else {
      // Create new user
      const fields: Record<string, string | boolean> = {
        Title: email,
        FullName: fullName,
        VerificationToken: verificationToken,
        TokenExpiry: tokenExpiry,
        EmailVerified: false
      };
      
      const createResult = await createListItem(
        accessToken,
        SHAREPOINT_SITE_ID,
        USERS_LIST_ID!,
        fields
      );
      
      if (!createResult.success) {
        logger.error('Failed to create user in SharePoint:', { error: createResult.error, fields });
        
        // Check if error is related to missing column
        const errorMsg = JSON.stringify(createResult.error || '');
        if (errorMsg.includes('Field') && errorMsg.includes('not found')) {
           return { success: false, error: 'SharePoint List column missing. Please check: Title, FullName, VerificationToken, TokenExpiry, EmailVerified' };
        }
        
        return { success: false, error: 'Failed to create user. Please contact administrator to check SharePoint List columns.' };
      }
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Error in createUserWithToken:', error);
    return { success: false, error: 'Failed to process user' };
  }
}

/**
 * Verify email token and mark user as verified
 */
export async function verifyEmailToken(
  accessToken: string,
  email: string,
  token: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    await init(accessToken);
    
    // Find user by email
    const result = await getListItems<SharePointUser>(
      accessToken,
      SHAREPOINT_SITE_ID,
      USERS_LIST_ID!,
      {
        filter: `fields/Title eq '${email}'`,
        expand: ['fields'],
        select: ['id', 'createdDateTime', 'lastModifiedDateTime', 'fields'],
        top: 1
      }
    );
    
    if (!result.success || result.data.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    const userItem = result.data[0];
    
    // Check if token matches
    const storedToken = userItem.fields.VerificationToken;
    // Use trim() to handle potential whitespace issues
    if (!storedToken || storedToken.trim() !== token.trim()) {
      logger.warn('Token mismatch:', { 
        email, 
        receivedToken: token ? `${token.substring(0, 5)}...` : 'null',
        storedToken: storedToken ? `${storedToken.substring(0, 5)}...` : 'null'
      });
      return { success: false, error: 'Invalid verification token' };
    }
    
    // Check if token expired
    const tokenExpiry = new Date(userItem.fields.TokenExpiry || '');
    if (tokenExpiry < new Date()) {
      return { success: false, error: 'Verification token has expired. Please request a new one.' };
    }
    
    // Detect correct field name for EmailVerified (handle case sensitivity and spaces)
    let emailVerifiedField = 'EmailVerified';
    const fieldNames = Object.keys(userItem.fields);
    const foundField = fieldNames.find(f => 
      f.toLowerCase() === 'emailverified' || 
      f.toLowerCase() === 'email_x0020_verified' ||
      f.toLowerCase() === 'email verified'
    );
    
    if (foundField) {
      emailVerifiedField = foundField;
      logger.info(`Found existing EmailVerified field: ${foundField}`);
    } else {
      logger.info('EmailVerified field not found in existing item, using default: EmailVerified');
      logger.info('Available fields:', fieldNames);
    }

    // Prepare update fields
    const updateFields: Record<string, any> = {
      LastLoginDate: new Date().toISOString()
    };
    updateFields[emailVerifiedField] = true;

    // Mark as verified
    const { updateListItem } = await import('@/lib/graph-client');
    const updateResult = await updateListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      USERS_LIST_ID!,
      userItem.id,
      updateFields
    );
    
    if (!updateResult.success) {
      logger.error('Failed to update user verification status:', updateResult.error);
      const errorMsg = updateResult.error instanceof Error ? updateResult.error.message : JSON.stringify(updateResult.error);
      return { success: false, error: `Failed to verify email: ${errorMsg}` };
    }
    
    const user = mapSharePointItemToUser(userItem);
    user.emailVerified = true;
    
    return { success: true, user };
  } catch (error) {
    logger.error('Error in verifyEmailToken:', error);
    return { success: false, error: 'Email verification failed' };
  }
}

