/**
 * SharePoint Project Service
 * Manages project data in SharePoint Lists using Microsoft Graph API
 * Replaces Supabase project-service.ts
 */

'use server'

import { Project, ProjectFormData } from '@/types/project'
import { getListItems, createListItem, updateListItem, deleteListItem, getAccessToken } from '@/lib/graph-client'
import { getTicketsByProjectId, updateTicket } from '@/lib/actions/sharepoint-ticket-service'
import { logger } from '@/lib/logger'
import { revalidateTag, revalidatePath } from 'next/cache'

// SharePoint configuration from environment
const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID!
const PROJECTS_LIST_NAME = 'Projects'

if (!SHAREPOINT_SITE_ID) {
  console.error('❌ SHAREPOINT_SITE_ID is missing in environment variables')
}

// Cached list ID
let PROJECTS_LIST_ID: string | null = null
// Cached EndDate column internal name
let END_DATE_COLUMN_INTERNAL_NAME: string = 'EndDate'

/**
 * Helper to map SharePoint list item to Project type
 */
function mapSharePointItemToProject(item: any): Project {
  const fields = item.fields || item
  
  // Use custom CreatedAt field if available, otherwise fall back to system Created
  const createdAt = fields.CreatedAt || item.createdDateTime || fields.Created
  const updatedAt = item.lastModifiedDateTime || fields.Modified
  
  return {
    id: item.id || fields.id,
    projectCode: fields.Title || fields.ProjectCode,
    projectName: fields.ProjectName,
    contactNumber: fields.ContactNumber,
    signDate: fields.SignDate,
    // Try to catch the EndDate from various possible field names
    endDate: fields.EndDate || fields.End_x0020_Date || fields['End Date'] || fields.OData__x0045_ndDate || fields.OData__EndDate,
    suppliers: fields.Suppliers ? JSON.parse(fields.Suppliers) : [],
    reporters: (fields.ContactPerson || fields.Contact_x0020_Person || fields.Reporters || fields.reporters) ? JSON.parse(fields.ContactPerson || fields.Contact_x0020_Person || fields.Reporters || fields.reporters) : [],
    slaLevel: fields.SLALevel ? JSON.parse(fields.SLALevel) : { high: 4, medium: 8, low: 24 },
    projectManager: fields.ProjectManager ? JSON.parse(fields.ProjectManager) : {},
    status: fields.ProjectStatus || 'Planning',
    createdAt,
    updatedAt,
  }
}

/**
 * Helper to map Project to SharePoint fields
 */
function mapProjectToSharePointFields(project: ProjectFormData | Project): Record<string, any> {
  const fields: Record<string, any> = {
    Title: project.projectCode,
    ProjectName: project.projectName,
    ContactNumber: project.contactNumber,
    SignDate: project.signDate ? project.signDate : null,
    [END_DATE_COLUMN_INTERNAL_NAME]: (project as any).endDate ? (project as any).endDate : null,
    Suppliers: JSON.stringify(project.suppliers),
    ContactPerson: JSON.stringify(project.reporters || []),
    SLALevel: JSON.stringify(project.slaLevel),
    ProjectManager: JSON.stringify(project.projectManager),
    ProjectStatus: 'status' in project ? project.status : 'Planning',
  }
  
  // Set CreatedAt only for new projects (not in update)
  if (!('id' in project)) {
    fields.CreatedAt = new Date().toISOString()
  }
  
  return fields
}

/**
 * Helper to ensure EndDate column exists
 */
async function ensureEndDateColumn(accessToken: string, listId: string) {
  try {
    const { getListColumns, addColumn } = await import('@/lib/graph-client')
    const columns = await getListColumns(accessToken, SHAREPOINT_SITE_ID, listId)
    
    if (columns.success && columns.data) {
      // Check for EndDate (or End Date) column
      // We need to find the specific column object to get its ACTUAL name
      const endDateCol = columns.data.find((c: any) => 
        c.name === 'EndDate' || 
        c.name === 'End_x0020_Date' ||
        c.displayName === 'End Date' || 
        c.displayName === 'EndDate'
      );
      
      if (endDateCol) {
          console.log(`✅ Found Project EndDate column: ${endDateCol.name} (Display: ${endDateCol.displayName})`);
          END_DATE_COLUMN_INTERNAL_NAME = endDateCol.name;
      } else {
        console.log('🆕 Project EndDate column missing. Creating...')
        await addColumn(accessToken, SHAREPOINT_SITE_ID, listId, {
          name: 'EndDate',
          displayName: 'End Date',
          dateTime: {
            displayAs: 'default',
            format: 'dateOnly'
          }
        })
        console.log('✅ Project EndDate column created (defaulting internal name to EndDate).');
        END_DATE_COLUMN_INTERNAL_NAME = 'EndDate';
      }
    }
  } catch (error) {
    console.error('Failed to ensure EndDate column:', error)
  }
}

/**
 * Initialize service - get Projects list ID
 */
async function initProjectService(accessToken: string): Promise<void> {
  if (PROJECTS_LIST_ID) return
  
  try {
    const { getSharePointListId } = await import('@/lib/graph-client')
    PROJECTS_LIST_ID = await getSharePointListId(accessToken, SHAREPOINT_SITE_ID, PROJECTS_LIST_NAME)
    
    if (!PROJECTS_LIST_ID) {
      throw new Error('Projects list not found in SharePoint')
    }
    
    // Ensure EndDate column exists
    await ensureEndDateColumn(accessToken, PROJECTS_LIST_ID)
  } catch (error) {
    logger.error('Failed to initialize SharePoint Project Service:', error)
    throw error
  }
}

/**
 * Server Actions - Individual async functions
 */

export async function getAllProjects(): Promise<Project[]> {
  try {
    const accessToken = await getAccessToken()
    await initProjectService(accessToken)
    
    const result = await getListItems(
      accessToken,
      SHAREPOINT_SITE_ID,
      PROJECTS_LIST_ID!,
      {
        orderBy: 'createdDateTime desc',
        expand: ['fields']
      }
    )
    
    if (!result.success) {
      logger.error('Failed to fetch projects:', result.error)
      return []
    }
    
    console.log('📊 Projects fetched from SharePoint:', result.data.length)
    if (result.data.length > 0) {
      console.log('Sample project data:', result.data[0])
      // Debug: Log all field names to help find the correct internal name for ContactPerson
      console.log('🔎 Available SharePoint Field Keys:', Object.keys(result.data[0].fields))
      // Check specifically for any field resembling ContactPerson
      console.log('🔎 "Contact" related fields:', Object.keys(result.data[0].fields).filter(k => k.toLowerCase().includes('contact')))
    }
    
    return result.data.map(mapSharePointItemToProject)
  } catch (error) {
    logger.error('Error in getAllProjects:', error)
    console.error('❌ getAllProjects error:', error)
    return []
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const accessToken = await getAccessToken()
    await initProjectService(accessToken)
    
    const { getListItem } = await import('@/lib/graph-client')
    const result = await getListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      PROJECTS_LIST_ID!,
      id
    )
    
    if (!result.success || !result.data) {
      console.log('❌ getProjectById: Item not found or error', result.error)
      return null
    }

    const mapped = mapSharePointItemToProject(result.data)
    console.log(`🔍 getProjectById(${id}) reporters:`, mapped.reporters)
    
    return mapped
  } catch (error) {
    logger.error('Error in getProjectById:', error)
    return null
  }
}

export async function createProject(data: ProjectFormData): Promise<Project> {
  try {
    const accessToken = await getAccessToken()
    await initProjectService(accessToken)
    
    const suppliersWithIds = data.suppliers.map((supplier, index) => ({
      ...supplier,
      id: supplier.id || `supplier-${Date.now()}-${index}`
    }))
    
    const fields = mapProjectToSharePointFields({
      ...data,
      suppliers: suppliersWithIds
    })
    
    const result = await createListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      PROJECTS_LIST_ID!,
      fields
    )
    
    if (!result.success) {
      throw new Error(`Failed to create project: ${result.error}`)
    }
    
    revalidateTag('projects', {})
    revalidatePath('/projects')
    return mapSharePointItemToProject(result.data)
  } catch (error) {
    logger.error('Error creating project:', error)
    throw new Error(`Failed to create project: ${error}`)
  }
}

export async function updateProject(
  id: string,
  projectData: Partial<ProjectFormData>
): Promise<Project> {
  try {
    const accessToken = await getAccessToken()
    await initProjectService(accessToken)
    
    const existing = await getProjectById(id)
    if (!existing) {
      throw new Error('Project not found')
    }
    
    const merged = { ...existing, ...projectData }
    const fields = mapProjectToSharePointFields(merged)
    
    const result = await updateListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      PROJECTS_LIST_ID!,
      id,
      fields
    )
    
    if (!result.success) {
      throw new Error(`Failed to update project: ${result.error}`)
    }
    
    // Sync reporters with associated tickets
    if (projectData.reporters) {
      // Don't await this to keep UI responsive
      (async () => {
        try {
          console.log(`🔄 Syncing tickets for project ${id} with updated reporters...`)
          const tickets = await getTicketsByProjectId(id)
          console.log(`Found ${tickets.length} tickets to check for syncing`)
          
          let updateCount = 0
          for (const ticket of tickets) {
            if (!ticket.reporterId) continue
            
            const updatedReporter = projectData.reporters?.find(r => r.id === ticket.reporterId)
            
            if (updatedReporter) {
              // Check if any details changed
              if (updatedReporter.name !== ticket.reporterName || 
                  updatedReporter.email !== ticket.reporterEmail || 
                  updatedReporter.telephone !== ticket.reporterPhone) {
                
                console.log(`📝 Updating ticket ${ticket.ticketNumber} (${ticket.id}) with new reporter details`)
                await updateTicket(ticket.id!, {
                   reporterName: updatedReporter.name,
                   reporterEmail: updatedReporter.email,
                   reporterPhone: updatedReporter.telephone
                }, ticket)
                updateCount++
              }
            }
          }
          console.log(`✅ Synced ${updateCount} tickets with new reporter info`)
        } catch (syncError) {
          console.error('❌ Failed to sync tickets:', syncError)
        }
      })()
    }
    
    revalidateTag('projects', {})
    revalidatePath('/projects')
    return mapSharePointItemToProject(result.data)
  } catch (error) {
    logger.error('Error updating project:', error)
    throw new Error(`Failed to update project: ${error}`)
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const accessToken = await getAccessToken()
    await initProjectService(accessToken)
    
    const result = await deleteListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      PROJECTS_LIST_ID!,
      id
    )
    
    if (!result.success) {
      throw new Error(`Failed to delete project: ${result.error}`)
    }

    revalidateTag('projects', {})
    revalidatePath('/projects')
  } catch (error) {
    logger.error('Error deleting project:', error)
    throw new Error(`Failed to delete project: ${error}`)
  }
}

export async function getProjectByCode(projectCode: string): Promise<Project | null> {
  try {
    const accessToken = await getAccessToken()
    await initProjectService(accessToken)
    
    const result = await getListItems(
      accessToken,
      SHAREPOINT_SITE_ID,
      PROJECTS_LIST_ID!,
      {
        filter: `fields/Title eq '${projectCode}'`,
        expand: ['fields'],
        top: 1
      }
    )
    
    if (!result.success || result.data.length === 0) {
      return null
    }
    
    return mapSharePointItemToProject(result.data[0])
  } catch (error) {
    logger.error('Error in getProjectByCode:', error)
    return null
  }
}

/**
 * Batch update project statuses
 */
export async function batchUpdateProjectStatus(updates: { id: string, status: string }[]): Promise<void> {
  if (updates.length === 0) return;

  try {
    const accessToken = await getAccessToken()
    await initProjectService(accessToken)
    
    console.log(`🔄 Batch updating ${updates.length} projects...`);
    
    // Process in parallel
    await Promise.all(updates.map(update => 
      updateListItem(
        accessToken,
        SHAREPOINT_SITE_ID,
        PROJECTS_LIST_ID!,
        update.id,
        { ProjectStatus: update.status }
      )
    ));
    
    revalidateTag('projects', {})
    revalidatePath('/projects')
    console.log('✅ Batch update completed');
  } catch (error) {
    logger.error('Error in batchUpdateProjectStatus:', error)
    throw new Error(`Failed to batch update projects: ${error}`)
  }
}
