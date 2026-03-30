'use server'

import { batchUpdateProjectStatus } from '@/lib/actions/sharepoint-project-service'

export async function autoSyncProjectStatuses(updates: { id: string, status: string }[]) {
  if (updates.length === 0) return { success: true, count: 0 };
  
  try {
    await batchUpdateProjectStatus(updates);
    return { success: true, count: updates.length };
  } catch (error) {
    console.error('Auto sync failed:', error);
    return { success: false, error: String(error) };
  }
}
