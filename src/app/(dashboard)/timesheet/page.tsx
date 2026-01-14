import { TimesheetConfig } from '@/components/timesheet';

export const metadata = {
  title: 'Timesheet | Presence Manager',
  description: 'Enter and manage team member timesheets and track monthly hours',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default function TimesheetPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Timesheet</h2>
        <p className="text-muted-foreground">
          Track daily hours and time-off for team members with monthly calculations
        </p>
      </div>

      <TimesheetConfig />
    </div>
  );
}
