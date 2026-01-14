import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { PermissionLevel } from "@/types";

// Session timeout in seconds (8 hours as specified)
const SESSION_TIMEOUT_SECONDS = 8 * 60 * 60; // 8 hours = 28800 seconds

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            return null;
          }

          // Check if user is active
          if (!user.isActive) {
            return null;
          }

          // Check if user has denied permission level
          if (user.permissionLevel === "denied") {
            return null;
          }

          // Verify password
          const isPasswordValid = await bcryptjs.compare(password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          // Return user object for session
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            permissionLevel: user.permissionLevel,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, add user data to token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.permissionLevel = user.permissionLevel as PermissionLevel;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user data from token to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.permissionLevel = token.permissionLevel as PermissionLevel;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_TIMEOUT_SECONDS, // 8-hour session timeout
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
});
