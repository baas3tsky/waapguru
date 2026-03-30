import { unstable_cache } from 'next/cache';
import { getProjectById } from '@/lib/actions/sharepoint-project-service';
import { getAllTicketsAction } from '@/lib/actions/ticket-actions';
import ProjectDetailPage from '../components/ProjectDetailPage';
import { notFound } from 'next/navigation';

// Cache configuration
const getCachedProject = unstable_cache(
  async (id: string) => getProjectById(id),
  ['project-detail'],
  { revalidate: 60, tags: ['projects'] }
);

const getCachedTickets = unstable_cache(
  async () => getAllTicketsAction(),
  ['tickets-list'],
  { revalidate: 60, tags: ['tickets'] }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPageRoute({ params }: PageProps) {
  const { id } = await params;

  const [project, allTickets] = await Promise.all([
    getCachedProject(id),
    getCachedTickets()
  ]);

  if (!project) {
    notFound();
  }

  // Filter tickets for this project
  const projectTickets = allTickets.filter(ticket => ticket.projectId === id);

  return (
    <ProjectDetailPage 
      project={project} 
      tickets={projectTickets} 
    />
  );
}
