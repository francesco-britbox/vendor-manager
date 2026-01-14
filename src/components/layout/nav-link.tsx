"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
  "data-testid"?: string;
}

/**
 * Navigation link component with active state highlighting.
 * Automatically detects the current route and applies active styles.
 *
 * @param href - The destination URL
 * @param children - Link content
 * @param className - Additional CSS classes
 * @param activeClassName - CSS classes applied when link is active
 * @param exact - If true, only matches exact path. If false, matches path prefix.
 * @param data-testid - Test ID for automation
 */
export function NavLink({
  href,
  children,
  className,
  activeClassName,
  exact = false,
  "data-testid": testId,
}: NavLinkProps) {
  const pathname = usePathname();

  // Determine if this link is active
  // Handle special case for dashboard route - should always be exact match
  // to avoid highlighting when on other top-level routes
  const shouldExactMatch = href === "/dashboard" || exact;

  // For exact match: pathname must equal href
  // For prefix match: pathname must start with href (useful for nested routes like /vendors/123)
  const isActiveLink = shouldExactMatch
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        // Base styles
        "relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
        // Default (inactive) state
        "text-muted-foreground hover:text-foreground hover:bg-accent/50",
        // Active state styles
        isActiveLink && [
          "text-foreground",
          "bg-primary/10",
          "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2",
          "after:w-4/5 after:h-0.5 after:bg-primary after:rounded-full",
        ],
        // Custom active class overrides if provided
        isActiveLink && activeClassName,
        // Any additional custom classes
        className
      )}
      data-testid={testId}
      aria-current={isActiveLink ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
