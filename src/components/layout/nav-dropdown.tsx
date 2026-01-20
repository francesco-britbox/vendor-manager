"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Child navigation item within a dropdown
 */
interface NavDropdownChildItem {
  href: string;
  label: string;
  testId?: string;
  icon?: LucideIcon;
  /** RBAC resource key (used for filtering, not rendered) */
  resourceKey?: string;
}

interface NavDropdownProps {
  /** Parent menu label */
  label: string;
  /** Icon for the parent menu item */
  icon?: LucideIcon;
  /** Child navigation items */
  items: NavDropdownChildItem[];
  /** Test ID for automation */
  testId?: string;
  /** Additional CSS classes for the trigger */
  className?: string;
}

/**
 * Navigation dropdown component with expandable/collapsible behavior.
 * Renders a parent menu item that expands to show child navigation links.
 *
 * Features:
 * - Highlights when any child route is active
 * - Preserves active state indicators for child items
 * - Accessible with keyboard navigation (Radix UI)
 * - Visual hierarchy with icons and indentation
 */
export function NavDropdown({
  label,
  icon: Icon,
  items,
  testId,
  className,
}: NavDropdownProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  // Check if any child item is currently active
  const isAnyChildActive = items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        className={cn(
          // Base styles matching NavLink
          "relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
          "inline-flex items-center gap-1.5",
          // Default (inactive) state
          "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          // Active state when any child is active or dropdown is open
          (isAnyChildActive || isOpen) && [
            "text-foreground",
            "bg-primary/10",
          ],
          // Active underline indicator (only when child is active)
          isAnyChildActive && [
            "after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2",
            "after:w-4/5 after:h-0.5 after:bg-primary after:rounded-full",
          ],
          // Focus styles
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          className
        )}
        data-testid={testId}
        aria-expanded={isOpen}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-[180px]"
      >
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const ItemIcon = item.icon;

          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 w-full cursor-pointer",
                  isActive && "bg-accent font-medium"
                )}
                data-testid={item.testId}
                aria-current={isActive ? "page" : undefined}
              >
                {ItemIcon && <ItemIcon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
