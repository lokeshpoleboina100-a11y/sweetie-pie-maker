import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import JobCard from '@/components/JobCard';
import { mockJobs } from '@/lib/mock-data';

export default function WorkerMyJobs() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="My Jobs" />
      <div className="max-w-lg mx-auto px-4 py-4">
        <Tabs defaultValue="active">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-3">
            {mockJobs.slice(0, 2).map((job) => (
              <JobCard key={job.id} job={job} viewAs="worker" />
            ))}
          </TabsContent>
          <TabsContent value="completed">
            <p className="text-center text-muted-foreground py-8 text-sm">No completed jobs yet</p>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav role="worker" />
    </div>
  );
}
