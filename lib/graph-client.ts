/**
 * Microsoft Graph API Client
 * Wrapper for accessing Microsoft 365 services (SharePoint, OneDrive, etc.)
 */

import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential } from '@azure/identity'

// Cache access token to avoid unnecessary requests
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Get access token from Azure AD using client credentials
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token
  }

  const clientId = process.env.AZURE_AD_CLIENT_ID!
  const tenantId = process.env.AZURE_AD_TENANT_ID!
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!

  if (!clientId || !tenantId || !clientSecret) {
    throw new Error('Missing Azure AD credentials in environment variables')
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret)
  
  try {
    const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default')
    
    if (!tokenResponse || !tokenResponse.token) {
      throw new Error('Failed to obtain access token')
    }

    // Cache token with expiration
    cachedToken = {
      token: tokenResponse.token,
      expiresAt: tokenResponse.expiresOnTimestamp
    }

    return tokenResponse.token
  } catch (error) {
    console.error('Error getting access token:', error)
    throw new Error(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create authenticated Graph API client using access token
 */
export function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    },
  })
}

/**
 * Get SharePoint site information
 */
export async function getSiteInfo(accessToken: string, hostname: string, sitePath: string) {
  const client = getGraphClient(accessToken)
  
  try {
    const site = await client
      .api(`/sites/${hostname}:${sitePath}`)
      .get()
    
    return { success: true, data: site }
  } catch (error) {
    console.error('Error getting site info:', error)
    return { success: false, error }
  }
}

/**
 * Get SharePoint list by name
 */
export async function getListByName(
  accessToken: string,
  siteId: string,
  listName: string
) {
  if (!siteId) {
    console.error('❌ getListByName: siteId is missing')
    return { success: false, error: 'siteId is missing' }
  }

  const client = getGraphClient(accessToken)
  
  try {
    console.log('Searching for list:', listName, 'in site:', siteId)
    
    // Get all lists first
    const listsResponse = await client
      .api(`/sites/${siteId}/lists`)
      .get()
    
    console.log('Found lists:', listsResponse.value?.map((l: any) => ({
      name: l.name,
      displayName: l.displayName,
      title: l.displayName
    })))
    
    if (listsResponse.value && listsResponse.value.length > 0) {
      // Try to find by displayName or name
      const list = listsResponse.value.find(
        (l: any) => l.displayName === listName || l.name === listName
      )
      
      if (list) {
        console.log('List found:', list.displayName, 'ID:', list.id)
        return { success: true, data: list }
      }
    }
    
    console.warn('List not found:', listName)
    return { success: false, error: 'List not found' }
  } catch (error) {
    console.error('Error getting list:', error)
    return { success: false, error }
  }
}

/**
 * Generic function to query SharePoint list items
 */
export async function getListItems<T = any>(
  accessToken: string,
  siteId: string,
  listId: string,
  options?: {
    select?: string[]
    filter?: string
    orderBy?: string
    top?: number
    expand?: string[]
  }
) {
  const client = getGraphClient(accessToken)
  
  try {
    let query = client.api(`/sites/${siteId}/lists/${listId}/items`)
    
    // Apply expand first to get fields
    if (options?.expand) {
      query = query.expand(options.expand.join(','))
    } else {
      // Default: always expand fields
      query = query.expand('fields')
    }
    
    if (options?.select) {
      query = query.select(options.select.join(','))
    }
    
    if (options?.filter) {
      query = query.filter(options.filter)
    }
    
    if (options?.orderBy) {
      query = query.orderby(options.orderBy)
    }
    
    if (options?.top) {
      query = query.top(options.top)
    }
    
    const response = await query.get()
    
    return {
      success: true,
      data: response.value as T[],
      nextLink: response['@odata.nextLink']
    }
  } catch (error) {
    console.error('Error getting list items:', error)
    return { success: false, error, data: [] as T[] }
  }
}

/**
 * Get a single list item by ID
 */
export async function getListItem<T = any>(
  accessToken: string,
  siteId: string,
  listId: string,
  itemId: string | number
) {
  const client = getGraphClient(accessToken)
  
  try {
    const item = await client
      .api(`/sites/${siteId}/lists/${listId}/items/${itemId}`)
      .expand('fields')
      // .select('id,createdDateTime,lastModifiedDateTime,createdBy,fields') // Comment out select to fetch all fields including createdBy
      .get()
    
    return { success: true, data: item as T }
  } catch (error) {
    console.error('Error getting list item:', error)
    return { success: false, error }
  }
}

/**
 * Create a new list item
 */
export async function createListItem<T = any>(
  accessToken: string,
  siteId: string,
  listId: string,
  fields: Record<string, any>
) {
  const client = getGraphClient(accessToken)
  
  try {
    const item = await client
      .api(`/sites/${siteId}/lists/${listId}/items`)
      .post({
        fields
      })
    
    return { success: true, data: item as T }
  } catch (error) {
    console.error('Error creating list item:', error)
    return { success: false, error }
  }
}

/**
 * Update an existing list item
 */
export async function updateListItem<T = any>(
  accessToken: string,
  siteId: string,
  listId: string,
  itemId: string | number,
  fields: Record<string, any>
) {
  const client = getGraphClient(accessToken)
  
  try {
    const item = await client
      .api(`/sites/${siteId}/lists/${listId}/items/${itemId}`)
      .update({
        fields
      })
    
    return { success: true, data: item as T }
  } catch (error) {
    console.error('Error updating list item:', error)
    return { success: false, error }
  }
}

/**
 * Delete a list item
 */
export async function deleteListItem(
  accessToken: string,
  siteId: string,
  listId: string,
  itemId: string | number
) {
  const client = getGraphClient(accessToken)
  
  try {
    await client
      .api(`/sites/${siteId}/lists/${listId}/items/${itemId}`)
      .delete()
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting list item:', error)
    return { success: false, error }
  }
}

/**
 * Get list columns
 */
export async function getListColumns(
  accessToken: string,
  siteId: string,
  listId: string
) {
  const client = getGraphClient(accessToken)
  
  try {
    const response = await client
      .api(`/sites/${siteId}/lists/${listId}/columns`)
      .get()
    
    return { success: true, data: response.value }
  } catch (error) {
    console.error('Error getting list columns:', error)
    return { success: false, error }
  }
}

/**
 * Add a column to a list
 */
export async function addColumn(
  accessToken: string,
  siteId: string,
  listId: string,
  columnDefinition: Record<string, any>
) {
  const client = getGraphClient(accessToken)
  
  try {
    const response = await client
      .api(`/sites/${siteId}/lists/${listId}/columns`)
      .post(columnDefinition)
    
    return { success: true, data: response }
  } catch (error) {
    console.error('Error adding column:', error)
    return { success: false, error }
  }
}

/**
 * Upload file to SharePoint Document Library
 */
export async function uploadFile(
  accessToken: string,
  siteId: string,
  driveId: string,
  folderPath: string,
  fileName: string,
  fileContent: Buffer | Blob
) {
  const client = getGraphClient(accessToken)
  
  try {
    // For files < 4MB, use simple upload
    const uploadPath = `${folderPath}/${fileName}`.replace(/\/+/g, '/')
    
    const file = await client
      .api(`/sites/${siteId}/drive/root:${uploadPath}:/content`)
      .put(fileContent)
    
    return { success: true, data: file }
  } catch (error) {
    console.error('Error uploading file:', error)
    return { success: false, error }
  }
}

/**
 * Download file from SharePoint
 */
export async function downloadFile(
  accessToken: string,
  siteId: string,
  driveId: string,
  itemId: string
) {
  const client = getGraphClient(accessToken)
  
  try {
    const file = await client
      .api(`/sites/${siteId}/drive/items/${itemId}/content`)
      .get()
    
    return { success: true, data: file }
  } catch (error) {
    console.error('Error downloading file:', error)
    return { success: false, error }
  }
}

/**
 * Delete file from SharePoint
 */
export async function deleteFile(
  accessToken: string,
  siteId: string,
  itemPath: string
) {
  const client = getGraphClient(accessToken)
  
  try {
    await client
      .api(`/sites/${siteId}/drive/root:${itemPath}`)
      .delete()
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting file:', error)
    return { success: false, error }
  }
}

/**
 * List files in a folder
 */
export async function listFiles(
  accessToken: string,
  siteId: string,
  folderPath: string
) {
  const client = getGraphClient(accessToken)
  
  try {
    const items = await client
      .api(`/sites/${siteId}/drive/root:${folderPath}:/children`)
      .get()
    
    return { success: true, data: items.value }
  } catch (error) {
    console.error('Error listing files:', error)
    return { success: false, error, data: [] }
  }
}

/**
 * Create folder in SharePoint
 */
export async function createFolder(
  accessToken: string,
  siteId: string,
  parentPath: string,
  folderName: string
) {
  const client = getGraphClient(accessToken)
  
  try {
    const folder = await client
      .api(`/sites/${siteId}/drive/root:${parentPath}:/children`)
      .post({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      })
    
    return { success: true, data: folder }
  } catch (error) {
    console.error('Error creating folder:', error)
    return { success: false, error }
  }
}

/**
 * Helper: Get SharePoint site ID from hostname and site path
 */
export async function getSharePointSiteId(
  accessToken: string,
  hostname: string,
  sitePath: string
): Promise<string | null> {
  const result = await getSiteInfo(accessToken, hostname, sitePath)
  
  if (result.success && result.data) {
    return result.data.id
  }
  
  return null
}

/**
 * Helper: Get list ID from list name
 */
export async function getSharePointListId(
  accessToken: string,
  siteId: string,
  listName: string
): Promise<string | null> {
  const result = await getListByName(accessToken, siteId, listName)
  
  if (result.success && result.data) {
    return result.data.id
  }
  
  return null
}
