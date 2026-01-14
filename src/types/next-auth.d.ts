import type { PermissionLevel } from "@/types";
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      permissionLevel: PermissionLevel;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    name: string;
    permissionLevel: PermissionLevel;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    email: string;
    name: string;
    permissionLevel: PermissionLevel;
  }
}
