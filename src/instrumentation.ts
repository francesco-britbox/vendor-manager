/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically loaded by Next.js on server startup.
 * Used to run initialization code before the app starts handling requests.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling issues
    const { autoSeedProtectableResourcesSafe } = await import(
      '@/lib/rbac/auto-seed'
    );

    // Auto-seed protectable resources (INSERT-ONLY mode)
    // This ensures new resources defined in code are available in the database
    // Existing resources and their customizations are never modified
    await autoSeedProtectableResourcesSafe();
  }
}
