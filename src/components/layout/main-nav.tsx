"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "./nav-link";
import { NavDropdown } from "./nav-dropdown";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Users, Clock, FileText, Briefcase, Building2 } from "lucide-react";

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
 * Child items for the Vendors Management dropdown
 */
const vendorsManagementChildren = [
  { href: "/vendors", label: "Vendors", testId: "nav-vendors", icon: Building2 },
  { href: "/team-members", label: "Team Members", testId: "nav-team-members", icon: Users },
  { href: "/timesheet", label: "Timesheet", testId: "nav-timesheet", icon: Clock },
  { href: "/invoices", label: "Invoices", testId: "nav-invoices", icon: FileText },
];

/**
 * Main navigation component for the dashboard.
 * Displays navigation links with active state highlighting.
 * Supports hierarchical menu structure with expandable dropdown sections.
 */
export function MainNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", testId: "nav-dashboard", exact: true },
    // Vendors, Team Members, Timesheet, and Invoices are under "Vendors Management" dropdown
    { href: "/analytics", label: "Analytics", testId: "nav-analytics" },
    { href: "/reports", label: "Reports", testId: "nav-reports" },
    // Settings links to /settings/roles as the entry point, but highlights for all /settings/* routes
    { href: "/settings/roles", label: "Settings", testId: "nav-settings" },
  ];

  // Check if we're on any settings page (for the Settings nav item)
  const isSettingsActive = pathname.startsWith("/settings");

  // Helper to render nav items with the Vendors Management dropdown in the correct position
  const renderNavItems = () => {
    const elements: React.ReactNode[] = [];

    navItems.forEach((item) => {
      // Add the Vendors Management dropdown after Dashboard
      if (item.href === "/dashboard") {
        elements.push(
          <NavLink
            key={item.href}
            href={item.href}
            exact={item.exact}
            data-testid={item.testId}
          >
            {item.label}
          </NavLink>
        );

        // Add the Vendors Management dropdown
        elements.push(
          <NavDropdown
            key="vendors-management"
            label="Vendors Management"
            icon={Briefcase}
            items={vendorsManagementChildren}
            testId="nav-vendors-management"
          />
        );
        return;
      }

      // Special handling for Settings: show active for any /settings/* route
      if (item.href === "/settings/roles") {
        elements.push(
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
        return;
      }

      // Regular nav items
      elements.push(
        <NavLink
          key={item.href}
          href={item.href}
          exact={item.exact}
          data-testid={item.testId}
        >
          {item.label}
        </NavLink>
      );
    });

    return elements;
  };

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
      {renderNavItems()}
    </nav>
  );
}
