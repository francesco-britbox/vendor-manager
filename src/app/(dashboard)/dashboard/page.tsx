import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MultiTimezoneClockCard, ProfileManagement, QuickLinksWidget } from "@/components/dashboard";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Multi-Timezone Clock Card */}
        <MultiTimezoneClockCard />

        {/* Profile Management Card */}
        <ProfileManagement
          initialData={{
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            permissionLevel: session.user.permissionLevel,
          }}
        />
      </div>

      {/* Quick Links Widget - Positioned above Session Info */}
      <div className="mt-6">
        <QuickLinksWidget />
      </div>

      {/* Session Info Section */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
            <CardDescription>Your current session details</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Session Timeout</dt>
                <dd className="font-medium">8 hours</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium text-green-600">Active</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
