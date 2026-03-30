import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import TicketDetailPage from '../components/TicketDetailPage';
import { getTicketById } from '@/lib/actions/ticket-service';
import { getProjectById } from '@/lib/actions/sharepoint-project-service';
import { getTicketChangeLogs } from '@/lib/actions/ticket-actions';

// Cache configuration
// const getCachedTicket = unstable_cache(
//   async (id: string) => getTicketById(id),
//   ['ticket-detail'],
//   { revalidate: 60, tags: ['tickets'] }
// );

const getCachedProject = unstable_cache(
  async (id: string) => getProjectById(id),
  ['project-detail'],
  { revalidate: 300, tags: ['projects'] }
);

const getCachedChangeLogs = unstable_cache(
  async (ticketId: string) => getTicketChangeLogs(ticketId),
  ['ticket-changelogs'],
  { revalidate: 60, tags: ['tickets'] }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch ticket directly without cache to prevent 404 on new tickets
  const ticket = await getTicketById(id);

  if (!ticket) {
    notFound();
  }

  // Parallel fetch for related data
  const [project, changeLogs] = await Promise.all([
    ticket.projectId ? getCachedProject(ticket.projectId) : Promise.resolve(null),
    getCachedChangeLogs(id)
  ]);

  return (
      <TicketDetailPage 
        ticket={ticket}
        project={project}
        changeLogs={changeLogs}
      />
  );
}
