import { NextResponse } from 'next/server'
import { getAllProjects, updateProject } from '@/lib/actions/sharepoint-project-service'
import { getListItems, getAccessToken, getSharePointListId } from '@/lib/graph-client'

export async function GET() {
  try {
    const projects = await getAllProjects();
    const accessToken = await getAccessToken();
    const siteId = process.env.SHAREPOINT_SITE_ID!;
    
    // Fetch ALL tickets once (up to 500 for now, increase logic if paging needed)
    const ticketsListId = await getSharePointListId(accessToken, siteId, 'Tickets');
    if (!ticketsListId) {
        return NextResponse.json({ success: false, error: 'Tickets list not found' });
    }

    const allTicketsResult = await getListItems(
        accessToken,
        siteId,
        ticketsListId,
        {
            select: ['id', 'fields'],
            expand: ['fields'],
            top: 500 // Assuming < 500 tickets for now
        }
    );

    if(!allTicketsResult.success) {
         return NextResponse.json({ success: false, error: allTicketsResult.error });
    }

    const allTickets = allTicketsResult.data || [];
    console.log(`Fetched ${allTickets.length} tickets total.`);

    let updatedCount = 0;
    const logs: string[] = [];

    for (const project of projects) {
        if (!project.id) continue;

        // Filter in memory - safer than OData filter guessing
        // Loose comparison (==) to handle string "2" vs number 2 match
        const tickets = allTickets.filter((t: any) => t.fields.ProjectId == project.id);
        
        if (tickets.length === 0) {
            logs.push(`Project ${project.projectCode} (ID: ${project.id}): No tickets found (Checked ${allTickets.length} total tickets).`);
            continue;
        }

        const uniqueReporters = new Map();

        tickets.forEach((t: any) => {
            const contactField = t.fields.ContactPerson || t.fields.Contact_x0020_Person;
            if (t.fields && contactField) {
                try {
                    const person = JSON.parse(contactField);
                    if (person && (person.email || person.name)) {
                        const key = person.email || person.name;
                        // Use email as key for uniqueness
                        if (!uniqueReporters.has(key)) {
                            uniqueReporters.set(key, {
                                id: person.id || `reporter-${Date.now()}-${Math.floor(Math.random() * 10000)}`, 
                                name: person.name,
                                email: person.email,
                                telephone: person.phone || person.telephone || ''
                            });
                        }
                    }
                } catch (e) {
                    console.error(`Error parsing ContactPerson for ticket ${t.fields.Title}`, e);
                }
            }
        });

        const reportersList = Array.from(uniqueReporters.values());

        if (reportersList.length > 0) {
            // Update project
            await updateProject(project.id, {
                reporters: reportersList // This will now save to ContactPerson due to previous service fix
            });
            updatedCount++;
            logs.push(`Project ${project.projectCode}: Updated with ${reportersList.length} reporters.`);
        } else {
            logs.push(`Project ${project.projectCode}: Found ${tickets.length} tickets but no valid ContactPerson info.`);
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `Updated ${updatedCount} projects.`,
        logs 
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
