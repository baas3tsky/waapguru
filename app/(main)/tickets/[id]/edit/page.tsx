import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import EditTicketPage from '../../components/EditTicketPage';
import { getTicketById } from '@/lib/actions/ticket-service';
import { getProjectById } from '@/lib/actions/sharepoint-project-service';

// Cache configuration
const getCachedTicket = unstable_cache(
  async (id: string) => getTicketById(id),
  ['ticket-detail-edit'],
  { revalidate: 60, tags: ['tickets'] }
);

const getCachedProject = unstable_cache(
  async (id: string) => getProjectById(id),
  ['project-detail-edit'],
  { revalidate: 300, tags: ['projects'] }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTicket({ params }: PageProps) {
  const { id } = await params;

  // Fetch ticket first
  const ticket = await getCachedTicket(id);

  if (!ticket) {
    notFound();
  }

  // Fetch project if ticket has one
  const project = ticket.projectId 
    ? await getCachedProject(ticket.projectId)
    : null;

  return (
    // <Suspense fallback={<Loading />}>
      <EditTicketPage ticket={ticket} project={project} />
    // </Suspense>
  );
}
