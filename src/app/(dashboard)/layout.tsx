import Link from "next/link";
import { UserNav } from "@/components/layout/user-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold hover:opacity-80">
              Presence Manager
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/vendors"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Vendors
              </Link>
              <Link
                href="/team-members"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-team-members"
              >
                Team Members
              </Link>
              <Link
                href="/timesheet"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-timesheet"
              >
                Timesheet
              </Link>
              <Link
                href="/invoices"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-invoices"
              >
                Invoices
              </Link>
              <Link
                href="/analytics"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-analytics"
              >
                Analytics
              </Link>
              <Link
                href="/reports"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-reports"
              >
                Reports
              </Link>
              <Link
                href="/settings/roles"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Roles
              </Link>
            </nav>
          </div>
          <UserNav />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
