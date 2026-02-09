"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Bell, Trophy, XCircle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.notifications.list.useQuery({ limit: 50 });
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const handleClick = (notification: {
    id: string;
    read: boolean;
    betId: string | null;
  }) => {
    if (!notification.read) {
      markReadMutation.mutate({ id: notification.id });
    }
    if (notification.betId) {
      router.push(`/bets/${notification.betId}`);
    }
  };

  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-theme-primary-100 rounded-xl">
            <Bell className="h-5 w-5 text-theme-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No notifications yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;ll be notified when bets are settled or cancelled.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((notification) => {
            const Icon =
              notification.type === "bet_settled" ? Trophy : XCircle;
            const iconColor =
              notification.type === "bet_settled"
                ? "text-yellow-500"
                : "text-red-500";
            const iconBg =
              notification.type === "bet_settled"
                ? "bg-yellow-100"
                : "bg-red-100";

            return (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={cn(
                  "w-full text-left rounded-xl border border-border p-4 flex gap-4 transition-colors hover:bg-muted/50",
                  !notification.read && "bg-theme-primary-50 border-theme-primary-100"
                )}
              >
                <div className={cn("mt-0.5 shrink-0 rounded-full p-2", iconBg)}>
                  <Icon className={cn("h-4 w-4", iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <div className="mt-1.5 shrink-0">
                        <div className="h-2 w-2 rounded-full bg-theme-primary" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{timeAgo(new Date(notification.createdAt))}</span>
                    {notification.group && (
                      <span className="bg-muted px-2 py-0.5 rounded-full">
                        {notification.group.name}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
