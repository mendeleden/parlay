"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Plus,
  Copy,
  RefreshCw,
  Check,
  X,
  ArrowLeft,
  Users,
  Ticket,
  Layers,
  Loader2,
  Trash2,
  ChevronRight,
  Clock,
  Lock,
  CheckCircle,
  XCircle,
  Sparkles,
  Share2,
  Trophy,
} from "lucide-react";
import { formatAmericanOdds, calculatePayout, isValidAmericanOdds } from "@/lib/odds";
import { CreditDisplay, CreditLeaderboard, AdminCreditDialog } from "@/components/credits";
import { ParlayBuilderDialog } from "@/components/parlays";
import { BetFilter, EmptyFilterState } from "@/components/ui/bet-filter";
import { ImportBetsModal } from "@/components/markets/import-bets-modal";
import { Import } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface BetOption {
  name: string;
  americanOdds: number;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const groupId = params.id as string;

  const [createBetOpen, setCreateBetOpen] = useState(false);
  const [betTitle, setBetTitle] = useState("");
  const [betDescription, setBetDescription] = useState("");
  const [options, setOptions] = useState<BetOption[]>([
    { name: "", americanOdds: 100 },
    { name: "", americanOdds: 100 },
  ]);
  const [copied, setCopied] = useState(false);
  const [creditAdjustOpen, setCreditAdjustOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    userId: string;
    username: string;
    balance?: string;
  } | null>(null);

  // Parlay builder dialog state
  const [parlayBuilderOpen, setParlayBuilderOpen] = useState(false);

  // Import bets modal state
  const [importBetsOpen, setImportBetsOpen] = useState(false);

  // Bet filter state
  const [betFilter, setBetFilter] = useState<"all" | "open" | "locked" | "settled">("all");

  const utils = trpc.useUtils();

  const { data: group, isLoading: groupLoading } = trpc.groups.getById.useQuery(
    { id: groupId }
  );
  // Use the actual group UUID for related queries (groupId from URL may be a slug)
  const actualGroupId = group?.id;
  const { data: bets, isLoading: betsLoading } = trpc.bets.getByGroup.useQuery(
    { groupId: actualGroupId! },
    { enabled: !!actualGroupId }
  );
  const { data: parlays, isLoading: parlaysLoading } =
    trpc.parlays.getByGroup.useQuery(
      { groupId: actualGroupId! },
      { enabled: !!actualGroupId }
    );
  const { data: pendingRequests } = trpc.groups.getPendingRequests.useQuery(
    { groupId: actualGroupId! },
    { enabled: !!actualGroupId }
  );
  const { data: myCredits } = trpc.credits.getMyCredits.useQuery(
    { groupId: actualGroupId! },
    { enabled: !!actualGroupId }
  );
  const { data: groupCredits } = trpc.credits.getGroupCredits.useQuery(
    { groupId: actualGroupId! },
    { enabled: !!actualGroupId }
  );

  const createBetMutation = trpc.bets.create.useMutation({
    onSuccess: () => {
      toast.success("Bet created!");
      setCreateBetOpen(false);
      resetForm();
      if (actualGroupId) utils.bets.getByGroup.invalidate({ groupId: actualGroupId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleMembershipMutation = trpc.groups.handleMembershipRequest.useMutation({
    onSuccess: () => {
      toast.success("Request handled");
      if (actualGroupId) {
        utils.groups.getPendingRequests.invalidate({ groupId: actualGroupId });
        utils.credits.getGroupCredits.invalidate({ groupId: actualGroupId });
      }
      utils.groups.getById.invalidate({ id: groupId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const regenerateCodeMutation = trpc.groups.regenerateInviteCode.useMutation({
    onSuccess: () => {
      toast.success("New invite code generated");
      utils.groups.getById.invalidate({ id: groupId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createParlayMutation = trpc.parlays.create.useMutation({
    onSuccess: () => {
      toast.success("Parlay placed!");
      setParlayBuilderOpen(false);
      if (actualGroupId) {
        utils.parlays.getByGroup.invalidate({ groupId: actualGroupId });
        utils.credits.getMyCredits.invalidate({ groupId: actualGroupId });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelParlayMutation = trpc.parlays.cancel.useMutation({
    onSuccess: () => {
      toast.success("Parlay cancelled and credits refunded!");
      if (actualGroupId) {
        utils.parlays.getByGroup.invalidate({ groupId: actualGroupId });
        utils.credits.getMyCredits.invalidate({ groupId: actualGroupId });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePlaceParlay = (legs: { betId: string; optionId: string }[], amount: number) => {
    createParlayMutation.mutate({
      groupId: actualGroupId!,
      amount,
      legs,
    });
  };

  const resetForm = () => {
    setBetTitle("");
    setBetDescription("");
    setOptions([
      { name: "", americanOdds: 100 },
      { name: "", americanOdds: 100 },
    ]);
  };

  const handleCreateBet = () => {
    if (!betTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    const validOptions = options.filter((o) => o.name.trim());
    if (validOptions.length < 2) {
      toast.error("At least 2 options required");
      return;
    }

    // Validate odds
    for (const opt of validOptions) {
      if (opt.americanOdds > -100 && opt.americanOdds < 100) {
        toast.error("Odds must be +100 or higher, or -100 or lower");
        return;
      }
    }

    createBetMutation.mutate({
      groupId: actualGroupId!,
      title: betTitle,
      description: betDescription || undefined,
      options: validOptions,
    });
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, { name: "", americanOdds: 100 }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, field: keyof BetOption, value: string | number) => {
    const updated = [...options];
    if (field === "americanOdds") {
      updated[index][field] = parseInt(value as string) || 0;
    } else {
      updated[index][field] = value as string;
    }
    setOptions(updated);
  };

  const copyInviteCode = () => {
    if (group?.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareInviteLink = () => {
    if (group?.inviteCode) {
      const inviteUrl = `${window.location.origin}/invite/${group.inviteCode}`;
      if (navigator.share) {
        navigator.share({
          title: `Join ${group.name} on Parlay`,
          text: `Join my betting group "${group.name}" on Parlay!`,
          url: inviteUrl,
        });
      } else {
        navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied!");
      }
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "open":
        return { icon: Clock, color: "text-green-600", bg: "bg-green-100", label: "Open" };
      case "locked":
        return { icon: Lock, color: "text-yellow-600", bg: "bg-yellow-100", label: "Locked" };
      case "settled":
        return { icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-100", label: "Settled" };
      case "cancelled":
        return { icon: XCircle, color: "text-gray-600", bg: "bg-gray-100", label: "Cancelled" };
      default:
        return { icon: Clock, color: "text-gray-600", bg: "bg-gray-100", label: status };
    }
  };

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-theme-primary" />
          <p className="text-gray-500">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 mb-4">Group not found</p>
        <Button
          onClick={() => router.push("/groups")}
          className="bg-theme-gradient"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Groups
        </Button>
      </div>
    );
  }

  const isAdmin = group.memberships?.some(
    (m) => m.userId === session?.user?.id && m.role === "admin" && m.status === "approved"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/groups")}
          className="shrink-0 text-theme-primary hover:bg-theme-primary-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-theme-gradient truncate">
              {group.name}
            </h1>
            {isAdmin && (
              <Badge className="bg-theme-badge hover:bg-theme-primary-100">
                <Sparkles className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
          {group.description && (
            <p className="text-gray-500 text-sm mt-1">{group.description}</p>
          )}
        </div>
      </motion.div>

      {/* Invite Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-theme-gradient-light rounded-2xl p-4 sm:p-5 border border-theme-primary-100"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Invite Code</p>
            <div className="flex items-center gap-2">
              <code className="text-xl sm:text-2xl font-mono font-bold text-theme-primary tracking-wider">
                {group.inviteCode}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyInviteCode}
                className="text-theme-primary hover:bg-theme-primary-100"
                title="Copy code"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={shareInviteLink}
                className="text-theme-primary hover:bg-theme-primary-100"
                title="Share invite link"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => regenerateCodeMutation.mutate({ groupId: actualGroupId! })}
                  disabled={regenerateCodeMutation.isPending}
                  className="text-theme-primary hover:bg-theme-primary-100"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      regenerateCodeMutation.isPending ? "animate-spin" : ""
                    }`}
                  />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {group.memberships?.filter((m) => m.status === "approved").length || 0}
              </p>
              <p className="text-xs text-gray-500">Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{bets?.length || 0}</p>
              <p className="text-xs text-gray-500">Bets</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Credit Display */}
      {myCredits && (
        <CreditDisplay
          availableBalance={myCredits.availableBalance}
          allocatedBalance={myCredits.allocatedBalance}
          totalBalance={myCredits.totalBalance}
        />
      )}

      {/* Pending Requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200"
        >
          <h3 className="font-semibold text-yellow-800 mb-3">
            Pending Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div
                key={request.userId}
                className="flex items-center justify-between bg-white rounded-xl p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.user.avatar || undefined} />
                    <AvatarFallback className="bg-theme-gradient-br text-white">
                      {getInitials(request.user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">@{request.user.username}</p>
                    <p className="text-sm text-gray-500">{request.user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() =>
                      handleMembershipMutation.mutate({
                        groupId: actualGroupId!,
                        userId: request.userId,
                        action: "reject",
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() =>
                      handleMembershipMutation.mutate({
                        groupId: actualGroupId!,
                        userId: request.userId,
                        action: "approve",
                      })
                    }
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="w-full sm:w-auto bg-theme-primary-50 p-1 rounded-xl">
          <TabsTrigger
            value="activity"
            className="flex-1 sm:flex-initial data-[state=active]:bg-white data-[state=active]:text-theme-primary rounded-lg"
          >
            <Ticket className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="flex-1 sm:flex-initial data-[state=active]:bg-white data-[state=active]:text-theme-primary rounded-lg"
          >
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
        </TabsList>

        {/* Activity Tab - Combined Bets & Parlays */}
        <TabsContent value="activity" className="mt-4 space-y-6">
          {/* Bets Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Bets</h3>
              <div className="flex gap-2">
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => setImportBetsOpen(true)}
                    className="border-theme-primary-200 text-theme-primary hover:bg-theme-primary-50"
                  >
                    <Import className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                )}
              <Dialog open={createBetOpen} onOpenChange={setCreateBetOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-theme-gradient hover:opacity-90">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Bet
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create a New Bet</DialogTitle>
                  <DialogDescription>
                    Set up betting options with American odds
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="betTitle">What are you betting on?</Label>
                    <Input
                      id="betTitle"
                      placeholder="e.g., Super Bowl LVIII Winner"
                      value={betTitle}
                      onChange={(e) => setBetTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="betDescription">Description (optional)</Label>
                    <Textarea
                      id="betDescription"
                      placeholder="Add more details..."
                      value={betDescription}
                      onChange={(e) => setBetDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Betting Options</Label>
                      {options.length < 10 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addOption}
                          className="text-theme-primary"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Option
                        </Button>
                      )}
                    </div>
                    <AnimatePresence>
                      {options.map((opt, idx) => {
                        const oddsValid = isValidAmericanOdds(opt.americanOdds);
                        const payout = oddsValid ? calculatePayout(opt.americanOdds, 100) : 0;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-1"
                          >
                            <div className="flex gap-2 items-start">
                              <div className="flex-1">
                                <Input
                                  placeholder={`Option ${idx + 1} (e.g., Chiefs)`}
                                  value={opt.name}
                                  onChange={(e) =>
                                    updateOption(idx, "name", e.target.value)
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentOdds = opt.americanOdds || 100;
                                    const absOdds = Math.abs(currentOdds);
                                    const newOdds = currentOdds > 0 ? -absOdds : absOdds;
                                    updateOption(idx, "americanOdds", newOdds);
                                  }}
                                  className={`w-10 h-10 rounded-lg font-bold text-lg transition-all ${
                                    opt.americanOdds >= 0
                                      ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                                      : "bg-red-100 text-red-600 hover:bg-red-200"
                                  }`}
                                >
                                  {opt.americanOdds >= 0 ? "+" : "−"}
                                </button>
                                <Input
                                  type="number"
                                  placeholder="150"
                                  min="100"
                                  className="w-20 text-center"
                                  value={Math.abs(opt.americanOdds) || ""}
                                  onChange={(e) => {
                                    const absValue = Math.abs(parseInt(e.target.value) || 0);
                                    const newOdds = opt.americanOdds < 0 ? -absValue : absValue;
                                    updateOption(idx, "americanOdds", newOdds);
                                  }}
                                />
                              </div>
                              {options.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeOption(idx)}
                                  className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            {oddsValid && (
                              <p className="text-xs text-gray-500 pl-1">
                                Bet <span className="font-medium text-gray-700">$100</span> → Get back{" "}
                                <span className="font-medium text-theme-primary">${payout.toFixed(0)}</span>
                                <span className="text-gray-400"> (${(payout - 100).toFixed(0)} profit)</span>
                              </p>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <p className="text-xs text-gray-500">
                      Tap +/− to toggle. <span className="text-emerald-600">+150</span> = underdog (bet $100, win $150). <span className="text-red-600">−150</span> = favorite (bet $150, win $100).
                    </p>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreateBetOpen(false);
                      resetForm();
                    }}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBet}
                    disabled={createBetMutation.isPending}
                    className="w-full sm:w-auto bg-theme-gradient hover:opacity-90"
                  >
                    {createBetMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create Bet"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              </div>
          </div>

          {/* Bet Filters */}
          {bets && bets.length > 0 && (
            <div className="mb-4">
              <BetFilter
                value={betFilter}
                onChange={setBetFilter}
                counts={{
                  all: bets.length,
                  open: bets.filter((b) => b.status === "open").length,
                  locked: bets.filter((b) => b.status === "locked").length,
                  settled: bets.filter((b) => b.status === "settled").length,
                }}
              />
            </div>
          )}

          {betsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-theme-primary" />
            </div>
          ) : !bets || bets.length === 0 ? (
            <EmptyFilterState filter="all" />
          ) : (
            (() => {
              const filteredBets = bets.filter(
                (bet) => betFilter === "all" || bet.status === betFilter
              );

              if (filteredBets.length === 0) {
                return <EmptyFilterState filter={betFilter} />;
              }

              return (
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                  key={betFilter} // Re-animate when filter changes
                >
                  {filteredBets.map((bet) => {
                    const statusInfo = getStatusInfo(bet.status);
                    const StatusIcon = statusInfo.icon;
                    const isOpenForBetting = bet.status === "open";
                    const userHasWager = bet.wagers?.some((w) => w.userId === session?.user?.id);
                    return (
                      <motion.div key={bet.id} variants={item}>
                    <Link href={`/bets/${bet.id}`}>
                      <div className={`bg-white rounded-2xl border p-4 hover:shadow-lg transition-all cursor-pointer ${
                        isOpenForBetting
                          ? "border-theme-primary-200 hover:border-theme-primary hover:shadow-theme"
                          : "border-gray-100 hover:border-gray-200"
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h4 className="font-semibold text-gray-900">
                                {bet.title}
                              </h4>
                              <Badge className={`${statusInfo.bg} ${statusInfo.color}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                              {userHasWager && (
                                <Badge className="bg-green-100 text-green-700">
                                  <Check className="h-3 w-3 mr-1" />
                                  You're in
                                </Badge>
                              )}
                            </div>
                            {bet.description && (
                              <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                                {bet.description}
                              </p>
                            )}
                            {/* Options display */}
                            <div className="flex flex-wrap gap-2">
                              {bet.options?.map((option) => (
                                <span
                                  key={option.id}
                                  className="text-xs bg-gray-100 px-2 py-1.5 rounded-lg"
                                >
                                  {option.name}{" "}
                                  <span className="font-semibold text-theme-primary">
                                    {formatAmericanOdds(option.americanOdds)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {bet.wagers?.length || 0}
                              </p>
                              <p className="text-xs text-gray-500">wagers</p>
                            </div>
                            {isOpenForBetting && !userHasWager ? (
                              <span className="text-xs font-medium text-theme-primary flex items-center gap-1">
                                Place wager <ChevronRight className="h-4 w-4" />
                              </span>
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              );
            })()
          )}
          </div>

          {/* Parlays Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-theme-primary" />
                <h3 className="text-lg font-semibold text-gray-900">My Parlays</h3>
              </div>
              <Button
                size="sm"
                onClick={() => setParlayBuilderOpen(true)}
                className="bg-theme-gradient"
              >
                <Plus className="h-4 w-4 mr-1" />
                Build Parlay
              </Button>
            </div>

            {parlaysLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-theme-primary" />
              </div>
            ) : !parlays || parlays.filter((p) => p.userId === session?.user?.id).length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-theme-gradient-br rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <p className="text-gray-600 font-medium mb-1">No parlays yet</p>
                <p className="text-gray-400 text-sm mb-3">
                  Combine multiple bets for bigger payouts
                </p>
                <Button
                  size="sm"
                  onClick={() => setParlayBuilderOpen(true)}
                  className="bg-theme-gradient"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Build Your First Parlay
                </Button>
              </div>
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {parlays
                  .filter((p) => p.userId === session?.user?.id)
                  .map((parlay) => {
                    const decimalOdds = parseFloat(parlay.combinedDecimalOdds);
                    const americanOdds = decimalOdds >= 2
                      ? Math.round((decimalOdds - 1) * 100)
                      : Math.round(-100 / (decimalOdds - 1));
                    // Check if parlay can be cancelled (all bets still open)
                    const canCancel =
                      parlay.result === "pending" &&
                      parlay.legs?.every((leg) => leg.bet?.status === "open");
                    return (
                      <motion.div key={parlay.id} variants={item}>
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-theme-primary-200 hover:shadow-lg hover:shadow-theme transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`${
                                  parlay.result === "won"
                                    ? "bg-green-100 text-green-700"
                                    : parlay.result === "lost"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}>
                                  {parlay.result === "pending" ? "Active" : parlay.result}
                                </Badge>
                                <span className="text-sm font-medium text-theme-primary">
                                  {formatAmericanOdds(americanOdds)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {parlay.legs?.map((leg, idx) => (
                                  <span
                                    key={leg.id || idx}
                                    className={`text-xs px-2 py-1 rounded-lg ${
                                      leg.result === "won"
                                        ? "bg-green-50 text-green-700"
                                        : leg.result === "lost"
                                        ? "bg-red-50 text-red-700 line-through"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {leg.option?.name || "Pick"}
                                  </span>
                                ))}
                              </div>
                              {/* Parlay controls */}
                              <div className="flex items-center gap-2">
                                <Link href={`/parlays/${parlay.id}`}>
                                  <Button size="sm" variant="outline" className="h-7 text-xs">
                                    View Details
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                  </Button>
                                </Link>
                                {canCancel && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => {
                                      if (confirm("Cancel this parlay and get your credits back?")) {
                                        cancelParlayMutation.mutate({ parlayId: parlay.id });
                                      }
                                    }}
                                    disabled={cancelParlayMutation.isPending}
                                  >
                                    {cancelParlayMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <>
                                        <X className="h-3 w-3 mr-1" />
                                        Cancel
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm text-gray-500">
                                ${parseFloat(parlay.amount).toFixed(0)} to win
                              </p>
                              <p className="font-bold text-theme-primary">
                                ${parseFloat(parlay.potentialPayout).toFixed(0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </motion.div>
            )}
          </div>
        </TabsContent>

        {/* Members Tab - Credit Leaderboard */}
        <TabsContent value="members" className="mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Credit Leaderboard
            </h3>
          </div>
          {groupCredits ? (
            <CreditLeaderboard
              credits={groupCredits}
              currentUserId={session?.user?.id}
              isAdmin={isAdmin}
              onAdjustCredits={(userId, username) => {
                const memberCredit = groupCredits.find((c) => c.userId === userId);
                setSelectedMember({
                  userId,
                  username,
                  balance: memberCredit?.availableBalance,
                });
                setCreditAdjustOpen(true);
              }}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-theme-primary" />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Admin Credit Adjustment Dialog */}
      {selectedMember && actualGroupId && (
        <AdminCreditDialog
          open={creditAdjustOpen}
          onOpenChange={setCreditAdjustOpen}
          groupId={actualGroupId}
          targetUserId={selectedMember.userId}
          targetUsername={selectedMember.username}
          currentBalance={selectedMember.balance}
          onSuccess={() => {
            if (actualGroupId) {
              utils.credits.getGroupCredits.invalidate({ groupId: actualGroupId });
              utils.credits.getMyCredits.invalidate({ groupId: actualGroupId });
            }
          }}
        />
      )}

      {/* Parlay Builder Dialog */}
      {bets && (
        <ParlayBuilderDialog
          open={parlayBuilderOpen}
          onOpenChange={setParlayBuilderOpen}
          bets={bets}
          currentUserId={session?.user?.id}
          availableCredits={myCredits ? parseFloat(myCredits.availableBalance) : undefined}
          onPlaceParlay={handlePlaceParlay}
          isPending={createParlayMutation.isPending}
        />
      )}

      {/* Import Bets Modal */}
      {actualGroupId && (
        <ImportBetsModal
          open={importBetsOpen}
          onOpenChange={setImportBetsOpen}
          groupId={actualGroupId}
          onImportComplete={() => {
            utils.bets.getByGroup.invalidate({ groupId: actualGroupId });
          }}
        />
      )}
    </div>
  );
}
