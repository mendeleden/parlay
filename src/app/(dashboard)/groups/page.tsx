"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Users,
  ChevronRight,
  KeyRound,
  Loader2,
  Sparkles,
  Coins,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function GroupsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [defaultCredits, setDefaultCredits] = useState("1000");
  const [inviteCode, setInviteCode] = useState("");

  const utils = trpc.useUtils();

  const { data: groups, isLoading } = trpc.groups.getMyGroups.useQuery();

  const createMutation = trpc.groups.create.useMutation({
    onSuccess: (data) => {
      toast.success("Group created successfully!");
      setCreateOpen(false);
      setGroupName("");
      setGroupDescription("");
      setRequiresApproval(true);
      setDefaultCredits("1000");
      utils.groups.getMyGroups.invalidate();
      utils.credits.getMyCredits.invalidate({ groupId: data.id });
      utils.credits.getGroupCredits.invalidate({ groupId: data.id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinMutation = trpc.groups.joinWithInviteCode.useMutation({
    onSuccess: (data) => {
      if (data.requiresApproval) {
        toast.success("Join request sent! Waiting for admin approval.");
      } else {
        toast.success("Joined group successfully!");
        utils.credits.getMyCredits.invalidate({ groupId: data.group.id });
        utils.credits.getGroupCredits.invalidate({ groupId: data.group.id });
      }
      setJoinOpen(false);
      setInviteCode("");
      utils.groups.getMyGroups.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    const credits = parseFloat(defaultCredits) || 1000;
    if (credits < 0 || credits > 1000000) {
      toast.error("Default credits must be between 0 and 1,000,000");
      return;
    }
    createMutation.mutate({
      name: groupName,
      description: groupDescription || undefined,
      requiresApproval,
      defaultCredits: credits,
    });
  };

  const handleJoin = () => {
    if (!inviteCode.trim()) {
      toast.error("Invite code is required");
      return;
    }
    joinMutation.mutate({ inviteCode: inviteCode.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-theme-primary" />
          <p className="text-gray-500">Loading your groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-theme-gradient">
            My Groups
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">
            Bet with your friends in private groups
          </p>
        </div>

        {/* Action buttons - stack on mobile */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto border-theme-primary-200 text-theme-primary hover:bg-theme-primary-50"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Join with Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Join a Group</DialogTitle>
                <DialogDescription>
                  Enter the invite code shared by your friend
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <Input
                    id="inviteCode"
                    placeholder="e.g., jdgjBmJj"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="text-center text-lg font-mono tracking-widest"
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setJoinOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleJoin}
                  disabled={joinMutation.isPending}
                  className="w-full sm:w-auto bg-theme-gradient hover:opacity-90"
                >
                  {joinMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Join Group"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-theme-gradient hover:opacity-90">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create a New Group</DialogTitle>
                <DialogDescription>
                  Start a betting group with your friends
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sunday Football Squad"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What's this group about?"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCredits" className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-theme-primary" />
                    Starting Credits
                  </Label>
                  <Input
                    id="defaultCredits"
                    type="number"
                    placeholder="1000"
                    min="0"
                    max="1000000"
                    value={defaultCredits}
                    onChange={(e) => setDefaultCredits(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Credits each member starts with when they join
                  </p>
                </div>
                <div className="flex items-center justify-between p-4 bg-theme-primary-50 rounded-xl">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Require Approval</Label>
                    <p className="text-xs text-gray-500">
                      You&apos;ll approve who joins
                    </p>
                  </div>
                  <Switch
                    checked={requiresApproval}
                    onCheckedChange={setRequiresApproval}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="w-full sm:w-auto bg-theme-gradient hover:opacity-90"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Group"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Groups list */}
      <AnimatePresence mode="wait">
        {!groups || groups.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-theme-gradient-light rounded-3xl p-8 sm:p-12 text-center border border-theme-primary-100"
          >
            <div className="mx-auto w-16 h-16 bg-theme-gradient-br rounded-2xl flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No groups yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Create your first group or join one with an invite code to start betting with friends
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setJoinOpen(true)}
                className="border-theme-primary-200 text-theme-primary"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Join Group
              </Button>
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-theme-gradient"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-3 sm:gap-4"
          >
            {groups.map((group) => (
              <motion.div key={group.id} variants={item}>
                <Link href={group.status === "approved" ? `/groups/${group.slug}` : "#"}>
                  <div
                    className={`
                      p-4 sm:p-5 rounded-2xl border transition-all
                      ${
                        group.status === "approved"
                          ? "bg-white border-gray-100 hover:border-theme-primary-200 hover:shadow-lg hover:shadow-theme cursor-pointer"
                          : "bg-gray-50 border-gray-100 cursor-default"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-theme-gradient-br rounded-xl sm:rounded-2xl flex items-center justify-center">
                          <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {group.name}
                            </h3>
                            {group.role === "admin" && (
                              <Badge className="bg-theme-badge hover:bg-theme-primary-100 text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {group.status === "pending" && (
                              <Badge variant="secondary" className="text-xs">
                                Pending
                              </Badge>
                            )}
                          </div>
                          {group.description && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">
                              {group.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Created by @{group.createdBy.username}
                          </p>
                        </div>
                      </div>
                      {group.status === "approved" && (
                        <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
