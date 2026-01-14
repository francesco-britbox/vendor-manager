"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "./nav-link";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Navigation item configuration
 */
interface NavItem {
  href: string;
  label: string;
  testId?: string;
  /** If true, only matches exact path. Default: false (matches path prefix) */
  exact?: boolean;
}

/**
 * Main navigation component for the dashboard.
 * Displays navigation links with active state highlighting.
 */
export function MainNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", testId: "nav-dashboard", exact: true },
    { href: "/vendors", label: "Vendors", testId: "nav-vendors" },
    { href: "/team-members", label: "Team Members", testId: "nav-team-members" },
    { href: "/timesheet", label: "Timesheet", testId: "nav-timesheet" },
    { href: "/invoices", label: "Invoices", testId: "nav-invoices" },
    { href: "/analytics", label: "Analytics", testId: "nav-analytics" },
    { href: "/reports", label: "Reports", testId: "nav-reports" },
    // Settings links to /settings/roles as the entry point, but highlights for all /settings/* routes
    { href: "/settings/roles", label: "Settings", testId: "nav-settings" },
  ];

  // Check if we're on any settings page (for the Settings nav item)
  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
      {navItems.map((item) => {
        // Special handling for Settings: show active for any /settings/* route
        if (item.href === "/settings/roles") {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // Base styles
                "relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                // Default (inactive) state
                "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                // Active state styles
                isSettingsActive && [
                  "text-foreground",
                  "bg-primary/10",
                  "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2",
                  "after:w-4/5 after:h-0.5 after:bg-primary after:rounded-full",
                ]
              )}
              data-testid={item.testId}
              aria-current={isSettingsActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <NavLink
            key={item.href}
            href={item.href}
            exact={item.exact}
            data-testid={item.testId}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
