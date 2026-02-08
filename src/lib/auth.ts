import { auth, currentUser } from "@clerk/nextjs/server";

export { auth, currentUser };

/**
 * Get the current user's Clerk ID
 * Returns null if not authenticated
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}
