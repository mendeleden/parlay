"use client";

import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users,
  Ticket,
  Loader2,
  CheckCircle,
  XCircle,
  LogIn,
  UserPlus,
  ArrowRight,
  Clock,
} from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { isLoaded, isSignedIn } = useUser();
  const sessionStatus = !isLoaded ? "loading" : isSignedIn ? "authenticated" : "unauthenticated";

  // Get public group info (works for unauthenticated users too)
  const { data: publicGroup, isLoading: publicLoading, isFetched: publicFetched } =
    trpc.groups.getPublicByInviteCode.useQuery(
      { inviteCode: code },
      { enabled: !!code, retry: false }
    );

  // Get membership status if authenticated
  const { data: membershipInfo, isLoading: membershipLoading } =
    trpc.groups.getByInviteCode.useQuery(
      { inviteCode: code },
      { enabled: !!code && sessionStatus === "authenticated", retry: false }
    );

  const utils = trpc.useUtils();

  const joinMutation = trpc.groups.joinWithInviteCode.useMutation({
    onSuccess: (data) => {
      if (data.requiresApproval) {
        toast.success("Join request sent! Waiting for admin approval.");
      } else {
        toast.success("Joined group successfully!");
        router.push(`/groups/${data.group.slug}`);
      }
      utils.groups.getByInviteCode.invalidate({ inviteCode: code });
      utils.groups.getMyGroups.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isLoading =
    !publicFetched || sessionStatus === "loading" || (sessionStatus === "authenticated" && membershipLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-white/50">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Invalid invite code
  if (!publicGroup) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex flex-col overflow-hidden relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
            animate={{
              background: [
                "radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)",
              ],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>

        <main className="relative z-10 flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center"
          >
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Invalid Invite
              </h1>
              <p className="text-white/50 mb-6">
                This invite link is invalid or has expired.
              </p>
              <Link href="/">
                <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500">
                  Go Home
                </Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Already a member
  if (membershipInfo?.membership) {
    const { status } = membershipInfo.membership;

    return (
      <div className="min-h-screen bg-[#0A0118] flex flex-col overflow-hidden relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
            animate={{
              background: [
                "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(192, 132, 252, 0.4) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
              ],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>

        <main className="relative z-10 flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm text-center"
          >
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
              {status === "approved" ? (
                <>
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    You're Already In!
                  </h1>
                  <p className="text-white/50 mb-2">
                    You're a member of{" "}
                    <span className="text-violet-400 font-medium">
                      {publicGroup.name}
                    </span>
                  </p>
                  <p className="text-white/30 text-sm mb-6">
                    Head to the group to place bets and check parlays.
                  </p>
                  <Link href={`/groups/${membershipInfo.group.slug}`}>
                    <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500">
                      Go to Group
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </>
              ) : status === "pending" ? (
                <>
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Clock className="h-8 w-8 text-yellow-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Request Pending
                  </h1>
                  <p className="text-white/50 mb-2">
                    Your request to join{" "}
                    <span className="text-violet-400 font-medium">
                      {publicGroup.name}
                    </span>{" "}
                    is pending.
                  </p>
                  <p className="text-white/30 text-sm mb-6">
                    An admin will review your request soon.
                  </p>
                  <Link href="/groups">
                    <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500">
                      View My Groups
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <XCircle className="h-8 w-8 text-red-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Request Rejected
                  </h1>
                  <p className="text-white/50 mb-6">
                    Your request to join this group was not approved.
                  </p>
                  <Link href="/groups">
                    <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500">
                      View My Groups
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Not authenticated - show sign up / sign in options
  if (sessionStatus !== "authenticated") {
    return (
      <div className="min-h-screen bg-[#0A0118] flex flex-col overflow-hidden relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
            animate={{
              background: [
                "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(192, 132, 252, 0.4) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
              ],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full"
            animate={{
              background: [
                "radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(244, 114, 182, 0.3) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)",
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, delay: 1 }}
          />
        </div>

        {/* Header */}
        <header className="relative z-10 p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center"
          >
            <Link href="/" className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
                <Ticket className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-white text-lg">Parlay</span>
            </Link>
          </motion.div>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 text-center">
              {/* Group Info */}
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <p className="text-white/50 text-sm mb-1">You're invited to join</p>
              <h1 className="text-2xl font-bold text-white mb-2">
                {publicGroup.name}
              </h1>
              {publicGroup.description && (
                <p className="text-white/40 text-sm mb-4">
                  {publicGroup.description}
                </p>
              )}
              <div className="flex items-center justify-center gap-4 text-sm text-white/50 mb-6">
                <span>{publicGroup.memberCount} members</span>
                <span>by @{publicGroup.createdBy}</span>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <Link href={`/sign-up?redirect=/invite/${code}`}>
                  <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Sign Up to Join
                  </Button>
                </Link>
                <Link href={`/sign-in?redirect=/invite/${code}`}>
                  <Button
                    variant="outline"
                    className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 hover:border-white/60"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    I Have an Account
                  </Button>
                </Link>
              </div>
            </div>

            <p className="text-center text-white/30 text-xs mt-6">
              For entertainment only. No real money involved.
            </p>
          </motion.div>
        </main>
      </div>
    );
  }

  // Authenticated but not a member - show join option
  return (
    <div className="min-h-screen bg-[#0A0118] flex flex-col overflow-hidden relative">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
          animate={{
            background: [
              "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
              "radial-gradient(circle, rgba(192, 132, 252, 0.4) 0%, transparent 70%)",
              "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
            ],
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 text-center">
            {/* Group Info */}
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-white" />
            </div>
            <p className="text-white/50 text-sm mb-1">You're invited to join</p>
            <h1 className="text-2xl font-bold text-white mb-2">
              {publicGroup.name}
            </h1>
            {publicGroup.description && (
              <p className="text-white/40 text-sm mb-4">
                {publicGroup.description}
              </p>
            )}
            <div className="flex items-center justify-center gap-4 text-sm text-white/50 mb-6">
              <span>{publicGroup.memberCount} members</span>
              <span>by @{publicGroup.createdBy}</span>
            </div>

            {publicGroup.requiresApproval && (
              <p className="text-amber-400/80 text-sm mb-4 bg-amber-400/10 rounded-lg py-2 px-3">
                This group requires admin approval to join
              </p>
            )}

            <Button
              onClick={() => joinMutation.mutate({ inviteCode: code })}
              disabled={joinMutation.isPending}
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
            >
              {joinMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Join Group
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
