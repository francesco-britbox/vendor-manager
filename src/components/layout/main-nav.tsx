"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "./nav-link";
import { NavDropdown } from "./nav-dropdown";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Users, Clock, FileText, Briefcase, Building2, ClipboardList } from "lucide-react";
import { useRBACPermissions } from "@/hooks/use-rbac-permissions";

/**
 * Navigation item configuration
 */
interface NavItem {
  href: string;
  label: string;
  testId?: string;
  /** If true, only matches exact path. Default: false (matches path prefix) */
  exact?: boolean;
  /** RBAC resource key for permission checking */
  resourceKey?: string;
}

/**
 * Child items for the Vendors Management dropdown
 */
const vendorsManagementChildren = [
  { href: "/vendors", label: "Vendors", testId: "nav-vendors", icon: Building2, resourceKey: "page:vendors" },
  { href: "/team-members", label: "Team Members", testId: "nav-team-members", icon: Users, resourceKey: "page:team-members" },
  { href: "/timesheet", label: "Timesheet", testId: "nav-timesheet", icon: Clock, resourceKey: "page:timesheet" },
  { href: "/invoices", label: "Invoices", testId: "nav-invoices", icon: FileText, resourceKey: "page:invoices" },
];

/**
 * Child items for the Reporting dropdown
 */
const reportingChildren = [
  { href: "/reporting/create", label: "Create Report", testId: "nav-reporting-create", icon: ClipboardList, resourceKey: "page:reporting-create" },
  { href: "/reporting", label: "View Reports", testId: "nav-reporting-view", icon: FileText, resourceKey: "page:reporting", exact: true },
];

/**
 * Main navigation component for the dashboard.
 * Displays navigation links with active state highlighting.
 * Supports hierarchical menu structure with expandable dropdown sections.
 */
export function MainNav() {
  const pathname = usePathname();
  const { canAccess, isLoading, isSuperUser } = useRBACPermissions();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", testId: "nav-dashboard", exact: true, resourceKey: "page:dashboard" },
    // Vendors, Team Members, Timesheet, and Invoices are under "Vendors Management" dropdown
    { href: "/analytics", label: "Analytics", testId: "nav-analytics", resourceKey: "page:analytics" },
    { href: "/reports", label: "Reports", testId: "nav-reports", resourceKey: "page:reports" },
    // Settings links to /settings/roles as the entry point, but highlights for all /settings/* routes
    { href: "/settings/roles", label: "Settings", testId: "nav-settings", resourceKey: "page:settings" },
  ];

  // Check if we're on any settings page (for the Settings nav item)
  const isSettingsActive = pathname.startsWith("/settings");

  // Filter nav items based on RBAC permissions
  const canAccessResource = (resourceKey?: string): boolean => {
    // While loading, show all items to prevent flash
    if (isLoading) return true;
    // Super users can access everything
    if (isSuperUser) return true;
    // If no resource key, allow access (not protected)
    if (!resourceKey) return true;
    return canAccess(resourceKey);
  };

  // Filter dropdown children based on permissions
  const filteredDropdownChildren = vendorsManagementChildren.filter(
    (child) => canAccessResource(child.resourceKey)
  );

  // Filter reporting dropdown children based on permissions
  const filteredReportingChildren = reportingChildren.filter(
    (child) => canAccessResource(child.resourceKey)
  );

  // Helper to render nav items with the Vendors Management dropdown in the correct position
  const renderNavItems = () => {
    const elements: React.ReactNode[] = [];

    navItems.forEach((item) => {
      // Skip items user doesn't have access to
      if (!canAccessResource(item.resourceKey)) {
        return;
      }

      // Add the Vendors Management and Reporting dropdowns after Dashboard
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

        // Add the Vendors Management dropdown only if user has access to any child
        if (filteredDropdownChildren.length > 0) {
          elements.push(
            <NavDropdown
              key="vendors-management"
              label="Vendors Management"
              icon={Briefcase}
              items={filteredDropdownChildren}
              testId="nav-vendors-management"
            />
          );
        }

        // Add the Reporting dropdown only if user has access to any child
        if (filteredReportingChildren.length > 0) {
          elements.push(
            <NavDropdown
              key="reporting"
              label="Delivery Reporting"
              icon={ClipboardList}
              items={filteredReportingChildren}
              testId="nav-reporting"
            />
          );
        }
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
