"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Users, Ticket, Menu, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navItems = [
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/bets", label: "Bets", icon: Ticket },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/groups" className="mr-6 flex items-center space-x-2">
            <div className="p-1.5 bg-theme-gradient-br rounded-lg">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <span className="hidden font-bold sm:inline-block text-theme-gradient">
              Parlay
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 transition-colors hover:text-theme-primary",
                  pathname.startsWith(item.href)
                    ? "text-theme-primary font-semibold"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-theme-primary">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-card border-r border-border">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Link
              href="/groups"
              className="flex items-center space-x-2 mb-8"
              onClick={() => setMobileOpen(false)}
            >
              <div className="p-2 bg-theme-gradient-br rounded-xl">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-theme-gradient">
                Parlay
              </span>
            </Link>
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
                    pathname.startsWith(item.href)
                      ? "bg-theme-primary-100 text-theme-primary"
                      : "text-muted-foreground hover:bg-theme-primary-50 hover:text-theme-primary"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Mobile logo */}
        <Link
          href="/groups"
          className="flex items-center space-x-2 md:hidden flex-1 justify-center"
        >
          <div className="p-1.5 bg-theme-gradient-br rounded-lg">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-theme-gradient">
            Parlay
          </span>
        </Link>

        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {isSignedIn && <NotificationBell />}
          {isSignedIn && (
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9 ring-2 ring-theme-primary-100 hover:ring-theme-primary-200",
                },
              }}
            />
          )}
        </div>
      </div>
    </header>
  );
}
