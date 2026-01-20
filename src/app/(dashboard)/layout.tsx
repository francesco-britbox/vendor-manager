import Link from "next/link";
import Image from "next/image";
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
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80">
              <Image
                src="/images/britbox-logo.png"
                alt="Britbox"
                width={80}
                height={24}
                className="h-6 w-auto"
                priority
              />
              <span className="text-lg font-semibold text-gray-900">Delivery Manager</span>
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
