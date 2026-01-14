import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  canAccessRoute,
  isDenied,
  PERMISSION_LABELS,
  getRoutePermission,
} from "@/lib/permissions";
import type { PermissionLevel } from "@/types";

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth", "/api/currencies"];

// Routes that are public for reading but require auth for writing
const publicReadRoutes = ["/api/exchange-rates"];

// Check if path is a public route
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

// Check if path is a public read route
function isPublicReadRoute(pathname: string): boolean {
  return publicReadRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;
  const pathname = nextUrl.pathname;
  const method = req.method;

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    // If user is authenticated and tries to access login, redirect to dashboard
    if (isAuthenticated && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // Handle public read routes (allow GET without auth, require auth for write)
  if (isPublicReadRoute(pathname)) {
    if (method === "GET") {
      return NextResponse.next();
    }
    // For write operations, continue to auth check below
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get user's permission level from the session
  const userLevel = req.auth?.user?.permissionLevel as PermissionLevel;

  // Check if user is denied
  if (isDenied(userLevel)) {
    // For API routes, return 403 JSON response
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: "Access denied. Your account has been disabled.",
        },
        { status: 403 }
      );
    }
    // For page routes, redirect to login with error
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("error", "AccessDenied");
    return NextResponse.redirect(loginUrl);
  }

  // Check route-level permissions
  if (!canAccessRoute(userLevel, pathname, method)) {
    const requiredLevel = getRoutePermission(pathname, method);

    // For API routes, return 403 JSON response
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient permissions. Required: ${PERMISSION_LABELS[requiredLevel]}, Your level: ${PERMISSION_LABELS[userLevel]}`,
        },
        { status: 403 }
      );
    }

    // For page routes, redirect to dashboard with error (or a permission denied page)
    const deniedUrl = new URL("/dashboard", nextUrl);
    deniedUrl.searchParams.set("error", "InsufficientPermissions");
    return NextResponse.redirect(deniedUrl);
  }

  // User is authenticated and has permission, allow access
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
