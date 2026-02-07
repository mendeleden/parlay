import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isApiTrpcRoute = req.nextUrl.pathname.startsWith("/api/trpc");
  const isLandingPage = req.nextUrl.pathname === "/";
  const isInvitePage = req.nextUrl.pathname.startsWith("/invite");

  // Allow API routes to pass through
  if (isApiAuthRoute || isApiTrpcRoute) {
    return NextResponse.next();
  }

  // Allow landing page for everyone
  if (isLandingPage) {
    // Redirect logged-in users to dashboard
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/groups", req.url));
    }
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/groups", req.url));
  }

  // Allow auth pages for non-logged-in users
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Allow invite pages for everyone (handles auth inside the page)
  if (isInvitePage) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
