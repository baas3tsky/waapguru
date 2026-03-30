import { getAllTicketsAction } from '@/lib/actions/ticket-actions';
import { getAllProjects } from '@/lib/actions/sharepoint-project-service';
import TicketsListPage from './components/TicketsListPage';
import { Ticket } from '@/types/ticket';
import { Project } from '@/types/project';

interface TicketsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const resolvedSearchParams = await searchParams;

  // Temporary debug: Return empty data to check if page loads
  let tickets: Ticket[] = [];
  let projects: Project[] = [];
  let stats: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    overdueSlaTickets: number;
  } = {
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    overdueSlaTickets: 0
  };

  try {
    // 🚀 OPTIMIZATION: Fetch data in parallel to reduce load time
    // Use Promise.allSettled to ensure one failure doesn't block the other
    const [ticketsResult, projectsResult] = await Promise.allSettled([
      getAllTicketsAction(),
      getAllProjects()
    ]);

    if (ticketsResult.status === 'fulfilled') {
      tickets = ticketsResult.value;
      console.log('Tickets fetched successfully:', tickets.length);
    } else {
      console.error('Error fetching tickets:', ticketsResult.reason);
    }

    if (projectsResult.status === 'fulfilled') {
      projects = projectsResult.value;
      console.log('Projects fetched successfully');
    } else {
      console.error('Error fetching projects:', projectsResult.reason);
    }

    // 🚀 OPTIMIZATION: Calculate stats from already fetched tickets
    // This avoids a second API call to SharePoint which was causing double loading time
    if (tickets.length > 0) {
      stats = {
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'Open').length,
        inProgressTickets: tickets.filter(t => t.status === 'In Progress').length,
        resolvedTickets: tickets.filter(t => t.status === 'Resolved').length,
        closedTickets: tickets.filter(t => t.status === 'Closed').length,
        overdueSlaTickets: tickets.filter(t => {
          // Don't count resolved/closed tickets as overdue
          if (t.status === 'Resolved' || t.status === 'Closed' || !t.slaDeadline) return false;
          return new Date(t.slaDeadline) < new Date();
        }).length
      };
      console.log('Stats calculated locally from tickets data');
    }

  } catch (error) {
    console.error('TicketsPage: Critical error', error);
  }

  return (
    <TicketsListPage 
      searchParams={resolvedSearchParams}
      initialTickets={tickets}
      initialProjects={projects}
      initialStats={stats}
    />
  );
}
