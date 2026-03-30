import { NextResponse } from 'next/server';
import { getAllProjects, batchUpdateProjectStatus } from '@/lib/actions/sharepoint-project-service';
import { getAllTickets } from '@/lib/actions/sharepoint-ticket-service';
import { calculateProjectStatus } from '@/lib/project-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔄 Starting project status sync...');
    const [projects, allTickets] = await Promise.all([
      getAllProjects(),
      getAllTickets()
    ]);
    
    console.log(`Found ${projects.length} projects and ${allTickets.length} tickets.`);
    
    const results = [];
    const updates: { id: string, status: string }[] = [];

    for (const project of projects) {
      if (!project.id) continue;

      // Filter tickets in memory to avoid SharePoint filter issues
      const tickets = allTickets.filter(t => t.projectId === project.id);
      const newStatus = calculateProjectStatus(project, tickets);

      console.log(`Project: ${project.projectName} (${project.projectCode}) - Current: ${project.status}, Calculated: ${newStatus}, Tickets: ${tickets.length}`);

      // Always add to results for debugging
      results.push({
        projectId: project.id,
        projectName: project.projectName,
        currentStatus: project.status,
        calculatedStatus: newStatus,
        ticketCount: tickets.length,
        tickets: tickets.map(t => ({ id: t.id, status: t.status })),
        updated: project.status !== newStatus
      });

      if (project.status !== newStatus) {
        updates.push({ id: project.id, status: newStatus });
      }
    }

    if (updates.length > 0) {
      await batchUpdateProjectStatus(updates);
      console.log(`✅ Batch updated ${updates.length} projects`);
    }

    return NextResponse.json({
      success: true,
      totalProjects: projects.length,
      updatedCount: updates.length,
      details: results
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
