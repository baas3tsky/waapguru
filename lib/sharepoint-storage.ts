/**
 * SharePoint Storage Service
 * Manages file uploads/downloads in SharePoint Document Library
 * Replaces Supabase storage-utils.ts
 */

import { uploadFile, downloadFile, deleteFile, listFiles, createFolder } from '@/lib/graph-client'
import { Attachment } from '@/types/ticket'
import { logger } from '@/lib/logger'

const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID!
const DOCUMENT_LIBRARY_NAME = 'TicketAttachments'

/**
 * Generate storage path for ticket attachment
 * Format: /{project_code}/{ticket_number}/{timestamp}-{filename}
 */
export function generateStoragePath(
  projectCode: string,
  ticketNumber: string,
  filename: string
): string {
  const timestamp = Date.now()
  const safeFilename = `${timestamp}-${filename}`
  
  return `/${projectCode}/${ticketNumber}/${safeFilename}`
}

/**
 * Create attachment object from SharePoint file
 */
function createAttachmentFromSharePointFile(file: any): Attachment {
  return {
    id: file.id,
    filename: file.name.replace(/^\d+-/, ''), // Remove timestamp prefix
    url: file.webUrl || file['@microsoft.graph.downloadUrl'],
    size: file.size,
    type: file.file?.mimeType || 'application/octet-stream',
  }
}

/**
 * Upload file to SharePoint Document Library
 */
export async function uploadTicketAttachment(
  accessToken: string,
  file: File | Buffer,
  projectCode: string,
  ticketNumber: string,
  filename?: string
): Promise<{ success: boolean; attachment?: Attachment; error?: string }> {
  try {
    const name = filename || (file instanceof File ? file.name : 'file')
    const folderPath = `/${projectCode}/${ticketNumber}`
    
    // Ensure folder exists
    await ensureFolderExists(accessToken, projectCode, ticketNumber)
    
    // Convert File to Buffer if needed
    let fileContent: Buffer
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      fileContent = Buffer.from(arrayBuffer)
    } else {
      fileContent = file
    }
    
    const storagePath = generateStoragePath(projectCode, ticketNumber, name)
    
    const result = await uploadFile(
      accessToken,
      SHAREPOINT_SITE_ID,
      '', // driveId not needed when using site/drive/root path
      '',
      storagePath,
      fileContent
    )
    
    if (!result.success) {
      logger.error('Upload error:', result.error)
      return {
        success: false,
        error: `Failed to upload ${name}`
      }
    }
    
    const attachment = createAttachmentFromSharePointFile(result.data)
    
    return { success: true, attachment }
  } catch (error) {
    logger.error('Error uploading file:', error)
    return {
      success: false,
      error: `Unexpected error uploading file`
    }
  }
}

/**
 * Upload multiple files to SharePoint
 */
export async function uploadTicketAttachments(
  accessToken: string,
  files: File[],
  projectCode: string,
  ticketNumber: string
): Promise<{ attachments: Attachment[]; errors: string[] }> {
  const attachments: Attachment[] = []
  const errors: string[] = []
  
  for (const file of files) {
    const result = await uploadTicketAttachment(
      accessToken,
      file,
      projectCode,
      ticketNumber
    )
    
    if (result.success && result.attachment) {
      attachments.push(result.attachment)
    } else if (result.error) {
      errors.push(result.error)
    }
  }
  
  return { attachments, errors }
}

/**
 * Delete file from SharePoint
 */
export async function deleteTicketAttachment(
  accessToken: string,
  projectCode: string,
  ticketNumber: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const folderPath = `/${projectCode}/${ticketNumber}`
    
    // List files to find the one with matching original name
    const filesResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, folderPath)
    
    if (!filesResult.success) {
      return { success: false, error: 'Failed to list files' }
    }
    
    const fileToDelete = filesResult.data.find((f: any) => 
      f.name.endsWith(filename) || f.name === filename
    )
    
    if (!fileToDelete) {
      return { success: false, error: 'File not found' }
    }
    
    const filePath = `${folderPath}/${fileToDelete.name}`
    const result = await deleteFile(accessToken, SHAREPOINT_SITE_ID, filePath)
    
    if (!result.success) {
      return { success: false, error: result.error instanceof Error ? result.error.message : String(result.error) }
    }
    
    return { success: true }
  } catch (error) {
    logger.error('Error deleting file:', error)
    return { success: false, error: 'Unexpected error deleting file' }
  }
}

/**
 * List all attachments for a ticket
 */
export async function listTicketAttachments(
  accessToken: string,
  projectCode: string,
  ticketNumber: string
): Promise<{ attachments: Attachment[]; error?: string }> {
  try {
    const folderPath = `/${projectCode}/${ticketNumber}`
    
    const result = await listFiles(accessToken, SHAREPOINT_SITE_ID, folderPath)
    
    if (!result.success) {
      // Folder might not exist yet (no attachments)
      if (result.error && String(result.error).includes('not found')) {
        return { attachments: [] }
      }
      return { attachments: [], error: String(result.error) }
    }
    
    const attachments = result.data
      .filter((item: any) => item.file) // Only files, not folders
      .map(createAttachmentFromSharePointFile)
    
    return { attachments }
  } catch (error) {
    logger.error('Error listing files:', error)
    return { attachments: [], error: 'Unexpected error listing files' }
  }
}

/**
 * Ensure project/ticket folder exists
 */
async function ensureFolderExists(
  accessToken: string,
  projectCode: string,
  ticketNumber: string
): Promise<void> {
  try {
    // Check if project folder exists, create if not
    const projectFolderPath = `/${projectCode}`
    const projectResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, projectFolderPath)
    
    if (!projectResult.success) {
      // Create project folder
      await createFolder(accessToken, SHAREPOINT_SITE_ID, '/', projectCode)
    }
    
    // Check if ticket folder exists, create if not
    const ticketFolderPath = `/${projectCode}/${ticketNumber}`
    const ticketResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, ticketFolderPath)
    
    if (!ticketResult.success) {
      // Create ticket folder
      await createFolder(accessToken, SHAREPOINT_SITE_ID, projectFolderPath, ticketNumber)
    }
  } catch (error) {
    logger.error('Error ensuring folder exists:', error)
    // Don't throw - upload might still work
  }
}

/**
 * Check if SharePoint storage is ready
 */
export async function isStorageReady(accessToken: string): Promise<boolean> {
  try {
    const result = await listFiles(accessToken, SHAREPOINT_SITE_ID, '/')
    return result.success
  } catch {
    return false
  }
}

/**
 * Get file download URL
 */
export async function getFileDownloadUrl(
  accessToken: string,
  projectCode: string,
  ticketNumber: string,
  filename: string
): Promise<string | null> {
  try {
    const folderPath = `/${projectCode}/${ticketNumber}`
    const filesResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, folderPath)
    
    if (!filesResult.success) {
      return null
    }
    
    const file = filesResult.data.find((f: any) => 
      f.name.endsWith(filename) || f.name === filename
    )
    
    if (!file) {
      return null
    }
    
    return file['@microsoft.graph.downloadUrl'] || file.webUrl
  } catch (error) {
    logger.error('Error getting download URL:', error)
    return null
  }
}
