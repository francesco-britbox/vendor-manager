import { TeamMemberConfig } from '@/components/team-members';

export const metadata = {
  title: 'Team Members | Presence Manager',
  description: 'Manage your team members and their assignments',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default function TeamMembersPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
        <p className="text-muted-foreground">
          Manage team member profiles, assignments, and utilization
        </p>
      </div>

      <TeamMemberConfig />
    </div>
  );
}
