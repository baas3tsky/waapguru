import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { getAllProjects } from '@/lib/actions/sharepoint-project-service'
import { getAllTicketsAction, getDashboardStatsAction } from '@/lib/actions/ticket-actions'
import DashboardClient from './components/DashboardClientComponent'

// Cache configuration
const getCachedProjects = unstable_cache(
  async () => getAllProjects(),
  ['projects-list'],
  { revalidate: 60, tags: ['projects'] }
);

const getCachedTickets = unstable_cache(
  async () => getAllTicketsAction(),
  ['tickets-list'],
  { revalidate: 60, tags: ['tickets'] }
);

const getCachedStats = unstable_cache(
  async () => getDashboardStatsAction(),
  ['dashboard-stats'],
  { revalidate: 60, tags: ['stats'] }
);

export default async function DashboardPage() {
  // Fetch data in parallel on the server with caching
  const [projects, tickets, stats] = await Promise.all([
    getCachedProjects(),
    getCachedTickets(),
    getCachedStats()
  ])

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient 
        initialProjects={projects} 
        initialTickets={tickets} 
        initialStats={stats} 
      />
    </Suspense>
  )
}

function DashboardLoading() {
  return (
    <div className='container mx-auto p-6'>
      <div className='flex items-center justify-between mb-8'>
        <div className='animate-pulse'>
          <div className='h-8 bg-gray-300 rounded w-48 mb-2'></div>
          <div className='h-4 bg-gray-200 rounded w-64'></div>
        </div>
        <div className='animate-pulse'>
          <div className='h-10 bg-gray-300 rounded w-24'></div>
        </div>
      </div>
      
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {[...Array(4)].map((_, i) => (
          <div key={i} className='animate-pulse'>
            <div className='h-32 bg-gray-300 rounded'></div>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {[...Array(2)].map((_, i) => (
          <div key={i} className='animate-pulse'>
            <div className='h-80 bg-gray-300 rounded'></div>
          </div>
        ))}
      </div>
    </div>
  )
}
