'use server';

/**
 * SharePoint Attachments Service
 * Handles file uploads to TicketAttachments document library
 */

import { getAccessToken, uploadFile, listFiles, deleteFile, createFolder } from '@/lib/graph-client';
import { Attachment } from '@/types/ticket';

const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID!;

if (!SHAREPOINT_SITE_ID) {
  console.error('❌ SHAREPOINT_SITE_ID is missing in environment variables');
}

/**
 * Upload ticket attachments to SharePoint TicketAttachments library
 * Folder structure: /{projectCode}/{ticketNumber}/{files}
 * Optional subfolder: /{projectCode}/{ticketNumber}/{subfolder}/{files}
 */
export async function uploadTicketAttachments(
  files: File[],
  projectCode: string,
  ticketNumber: string,
  subfolder?: string
): Promise<{ attachments: Attachment[]; errors: string[] }> {
  const attachments: Attachment[] = [];
  const errors: string[] = [];

  try {
    const accessToken = await getAccessToken();
    
    // Determine folder path based on subfolder
    let folderPath = `/Shared Documents/TicketAttachments/${projectCode}/${ticketNumber}`;
    
    if (subfolder === 'resolution') {
      // Resolution files go to a separate folder
      folderPath = `/Shared Documents/Resolution/${projectCode}/${ticketNumber}`;
    } else if (subfolder) {
      folderPath = `${folderPath}/${subfolder}`;
    }
    
    await ensureFolderExists(accessToken, projectCode, ticketNumber, subfolder);

    // Upload each file in parallel
    const uploadPromises = files.map(async (file) => {
      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const safeFilename = `${timestamp}-${file.name}`;

        // Upload to SharePoint
        const result = await uploadFile(
          accessToken,
          SHAREPOINT_SITE_ID,
          '', // driveId not needed when using site/drive/root path
          folderPath,
          safeFilename,
          buffer
        );

        if (result.success && result.data) {
          // Create attachment object
          const attachment: Attachment = {
            id: result.data.id,
            filename: file.name, // Store original filename
            url: result.data['@microsoft.graph.downloadUrl'] || result.data.webUrl,
            size: file.size,
            type: file.type
          };
          
          return { success: true, attachment };
        } else {
          console.error(`❌ Failed to upload ${file.name}:`, result.error);
          return { success: false, error: `Failed to upload ${file.name}: ${result.error}` };
        }
      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error);
        return { success: false, error: `Error uploading ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}` };
      }
    });

    const results = await Promise.all(uploadPromises);

    results.forEach(result => {
      if (result.success && result.attachment) {
        attachments.push(result.attachment);
        console.log(`✅ Uploaded: ${result.attachment.filename}`);
      } else if (result.error) {
        errors.push(result.error);
      }
    });

    return { attachments, errors };
  } catch (error) {
    console.error('Error in uploadTicketAttachments:', error);
    return {
      attachments: [],
      errors: [`Failed to initialize upload: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * List attachments for a ticket
 */
export async function listTicketAttachments(
  projectCode: string,
  ticketNumber: string,
  subfolder?: string
): Promise<{ attachments: Attachment[]; error?: string }> {
  try {
    const accessToken = await getAccessToken();
    
    let folderPath = `/Shared Documents/TicketAttachments/${projectCode}/${ticketNumber}`;
    
    if (subfolder === 'resolution') {
      folderPath = `/Shared Documents/Resolution/${projectCode}/${ticketNumber}`;
    } else if (subfolder) {
      folderPath = `${folderPath}/${subfolder}`;
    }

    const result = await listFiles(accessToken, SHAREPOINT_SITE_ID, folderPath);

    if (!result.success) {
      // Folder might not exist (no attachments)
      // Check for various "not found" error codes/messages from Graph API
      const errorStr = String(result.error || '');
      if (
        errorStr.includes('not found') || 
        errorStr.includes('itemNotFound') ||
        errorStr.includes('The resource could not be found') ||
        (result.error as any)?.code === 'itemNotFound'
      ) {
        return { attachments: [] };
      }
      return { attachments: [], error: errorStr };
    }

    // Convert SharePoint files to Attachment objects
    const attachments: Attachment[] = result.data
      .filter((item: { file?: unknown }) => item.file) // Only files, not folders
      .map((file: { id: string; name: string; webUrl?: string; '@microsoft.graph.downloadUrl'?: string; size: number; file?: { mimeType?: string } }) => ({
        id: file.id,
        filename: file.name.replace(/^\d+-/, ''), // Remove timestamp prefix
        url: file['@microsoft.graph.downloadUrl'] || file.webUrl || '',
        size: file.size,
        type: file.file?.mimeType || 'application/octet-stream'
      }));

    return { attachments };
  } catch (error) {
    console.error('Error listing attachments:', error);
    return {
      attachments: [],
      error: `Failed to list attachments: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Delete a ticket attachment
 */
export async function deleteTicketAttachment(
  projectCode: string,
  ticketNumber: string,
  filename: string,
  subfolder?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken();
    
    let folderPath = `/Shared Documents/TicketAttachments/${projectCode}/${ticketNumber}`;
    
    if (subfolder === 'resolution') {
      folderPath = `/Shared Documents/Resolution/${projectCode}/${ticketNumber}`;
    } else if (subfolder) {
      folderPath = `${folderPath}/${subfolder}`;
    }

    // List files to find the one with matching original name
    const filesResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, folderPath);

    if (!filesResult.success) {
      return { success: false, error: 'Failed to list files' };
    }

    const fileToDelete = filesResult.data.find((f: { name: string }) =>
      f.name.endsWith(filename) || f.name === filename
    );

    if (!fileToDelete) {
      return { success: false, error: 'File not found' };
    }

    const filePath = `${folderPath}/${fileToDelete.name}`;
    const result = await deleteFile(accessToken, SHAREPOINT_SITE_ID, filePath);

    if (!result.success) {
      return { success: false, error: String(result.error) };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return {
      success: false,
      error: `Failed to delete attachment: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Ensure folder structure exists for ticket attachments
 * Creates: /TicketAttachments/{projectCode}/{ticketNumber}
 */
async function ensureFolderExists(
  accessToken: string,
  projectCode: string,
  ticketNumber: string,
  subfolder?: string
): Promise<void> {
  try {
    // Use Shared Documents as base
    const sharedDocsPath = '/Shared Documents';
    
    let rootFolderName = 'TicketAttachments';
    if (subfolder === 'resolution') {
      rootFolderName = 'Resolution';
    }
    
    // Check if root folder exists (TicketAttachments or Resolution)
    const rootPath = `${sharedDocsPath}/${rootFolderName}`;
    const rootResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, rootPath);
    
    if (!rootResult.success) {
      // Create root folder in Shared Documents
      await createFolder(accessToken, SHAREPOINT_SITE_ID, sharedDocsPath, rootFolderName);
      console.log(`✅ Created ${rootFolderName} folder in Shared Documents`);
    }

    // Check if project folder exists
    const projectPath = `${rootPath}/${projectCode}`;
    const projectResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, projectPath);
    
    if (!projectResult.success) {
      // Create project folder
      await createFolder(accessToken, SHAREPOINT_SITE_ID, rootPath, projectCode);
      console.log(`✅ Created project folder: ${projectCode}`);
    }

    // Check if ticket folder exists
    const ticketPath = `${projectPath}/${ticketNumber}`;
    const ticketResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, ticketPath);
    
    if (!ticketResult.success) {
      // Create ticket folder
      await createFolder(accessToken, SHAREPOINT_SITE_ID, projectPath, ticketNumber);
      console.log(`✅ Created ticket folder: ${ticketNumber}`);
    }
    
    // Check if subfolder exists (if requested AND NOT resolution)
    if (subfolder && subfolder !== 'resolution') {
      const subfolderPath = `${ticketPath}/${subfolder}`;
      const subfolderResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, subfolderPath);
      
      if (!subfolderResult.success) {
        // Create subfolder
        await createFolder(accessToken, SHAREPOINT_SITE_ID, ticketPath, subfolder);
        console.log(`✅ Created subfolder: ${subfolder}`);
      }
    }
  } catch (error) {
    console.error('Error ensuring folder exists:', error);
    // Don't throw - upload might still work
  }
}

/**
 * Cleanup ticket attachment folder (orphaned files)
 */
export async function cleanupTicketAttachments(
  projectCode: string,
  ticketNumber: string
): Promise<void> {
  try {
    const accessToken = await getAccessToken();
    const folderPath = `/Shared Documents/TicketAttachments/${projectCode}/${ticketNumber}`;
    
    // Check if folder exists by listing it
    const listResult = await listFiles(accessToken, SHAREPOINT_SITE_ID, folderPath);
    
    if (listResult.success) {
      console.log(`🧹 Cleaning up existing attachment folder for ${ticketNumber}`);
      await deleteFile(accessToken, SHAREPOINT_SITE_ID, folderPath);
    }
  } catch (error) {
    console.warn(`Warning: Failed to cleanup attachments for ${ticketNumber}:`, error);
  }
}
