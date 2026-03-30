import { ProjectListPage } from './components/ProjectListPage'
import { getAllProjects } from '@/lib/actions/sharepoint-project-service'
import { getAllTicketsAction } from '@/lib/actions/ticket-actions'
import { unstable_cache } from 'next/cache'

// Cache projects data for 60 seconds
const getCachedProjects = unstable_cache(
  async () => getAllProjects(),
  ['projects-list'],
  { revalidate: 60, tags: ['projects'] }
)

// Cache tickets data for 60 seconds
const getCachedTickets = unstable_cache(
  async () => getAllTicketsAction(),
  ['tickets-list'],
  { revalidate: 60, tags: ['tickets'] }
)

export default async function ProjectsPage() {
  // Parallel data fetching
  const [projects, tickets] = await Promise.all([
    getCachedProjects(),
    getCachedTickets()
  ])

  return (
    <ProjectListPage
      projects={projects}
      tickets={tickets}
    />
  )
}
