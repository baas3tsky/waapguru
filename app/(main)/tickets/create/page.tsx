import { Suspense } from 'react';
import CreateTicketForm from '../components/CreateTicketForm';
import { getAllProjects } from '@/lib/actions/sharepoint-project-service';
import { getFrequentReporters } from '@/lib/actions/sharepoint-ticket-service';

export const dynamic = 'force-dynamic';

export default async function CreateTicketPage() {
  const [projects, frequentReporters] = await Promise.all([
    getAllProjects(),
    getFrequentReporters()
  ]);

  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[400px]">Loading...</div>}>
      <CreateTicketForm projects={projects} frequentReporters={frequentReporters} />
    </Suspense>
  );
}
