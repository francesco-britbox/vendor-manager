import Link from "next/link";
import { UserNav } from "@/components/layout/user-nav";
import { MainNav } from "@/components/layout/main-nav";

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
            <MainNav />
          </div>
          <UserNav />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
