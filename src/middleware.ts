import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/auth/signin(.*)",
  "/auth/signup(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/trpc(.*)",
  "/api/webhooks(.*)",
  "/stats",
  "/invite/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const isPublic = isPublicRoute(req);

  // Allow public routes
  if (isPublic) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
