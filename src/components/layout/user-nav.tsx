"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionBadge } from "@/components/permissions";

/**
 * Get user initials from name (up to 2 characters)
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserNav() {
  const { data: session } = useSession();
  const [hasProfilePicture, setHasProfilePicture] = useState(false);
  const [imageKey, setImageKey] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Fetch user profile to check if they have a profile picture
  useEffect(() => {
    if (!session?.user) return;

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setHasProfilePicture(data.data.hasProfilePicture);
            // Use timestamp as key to force image refresh when updated
            if (data.data.profilePictureUpdatedAt) {
              setImageKey(new Date(data.data.profilePictureUpdatedAt).getTime());
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    fetchProfile();
  }, [session?.user]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  if (!session?.user) {
    return null;
  }

  const initials = getInitials(session.user.name || "U");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 px-2 gap-2">
          {/* Avatar */}
          <div className="relative h-7 w-7 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
            {hasProfilePicture && !imageError ? (
              <img
                key={imageKey}
                src={`/api/user/profile-picture?t=${imageKey}`}
                alt={session.user.name || "Profile"}
                className="h-full w-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <span className="text-xs font-medium text-primary">
                {initials}
              </span>
            )}
          </div>
          {/* Name */}
          <span className="text-sm font-medium hidden sm:inline-block">
            {session.user.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-start gap-3">
            {/* Larger avatar in dropdown */}
            <div className="relative h-10 w-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
              {hasProfilePicture && !imageError ? (
                <img
                  src={`/api/user/profile-picture?t=${imageKey}`}
                  alt={session.user.name || "Profile"}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-sm font-medium text-primary">
                  {initials}
                </span>
              )}
            </div>
            <div className="flex flex-col space-y-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {session.user.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {session.user.email}
              </p>
              <PermissionBadge />
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={handleSignOut}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
