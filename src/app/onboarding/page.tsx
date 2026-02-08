"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/trpc/client";
import {
  Ticket,
  Check,
  X,
  Loader2,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useUser } from "@clerk/nextjs";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/groups";
  const { isLoaded, isSignedIn } = useUser();
  const [username, setUsername] = useState("");

  const debouncedUsername = useDebounce(username, 500);

  const usernameCheck = trpc.auth.checkUsername.useQuery(
    { username: debouncedUsername },
    { enabled: debouncedUsername.length >= 3 }
  );

  const updateUsernameMutation = trpc.auth.updateUsername.useMutation({
    onSuccess: async () => {
      toast.success("You're all set! Let's go!");
      router.push(redirectTo);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usernameCheck.data?.available) {
      toast.error("Please choose an available username");
      return;
    }

    updateUsernameMutation.mutate({ username });
  };

  const isFormValid = username.length >= 3 && usernameCheck.data?.available;

  // Redirect if not logged in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-[#0A0118] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0118] flex flex-col overflow-hidden relative">
      {/* Background gradient orbs */}
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
        {/* Confetti-like elements */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-3 h-3 bg-yellow-400 rounded-full"
          animate={{ y: [0, -20, 0], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-2 h-2 bg-pink-400 rounded-full"
          animate={{ y: [0, -15, 0], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
        <motion.div
          className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-violet-400 rounded-full"
          animate={{ y: [0, -25, 0], opacity: [1, 0.5, 1] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center max-w-md mx-auto"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Parlay</span>
          </div>
        </motion.div>
      </header>

      {/* Form */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {/* Card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-6xl mb-4"
              >
                <PartyPopper className="h-16 w-16 mx-auto text-yellow-400" />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Almost there!
              </h1>
              <p className="text-white/50">
                Pick a username for your friends to find you
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/80 text-sm font-medium">
                  Username
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    @
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="coolbettor"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl h-12 pl-8 pr-10"
                    autoFocus
                  />
                  {username.length >= 3 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameCheck.isLoading ? (
                        <Loader2 className="h-4 w-4 text-white/40 animate-spin" />
                      ) : usernameCheck.data?.available ? (
                        <div className="p-1 bg-emerald-500/20 rounded-full">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="p-1 bg-red-500/20 rounded-full">
                          <X className="h-3.5 w-3.5 text-red-400" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {username.length > 0 && username.length < 3 && (
                  <p className="text-xs text-white/40">At least 3 characters</p>
                )}
                {usernameCheck.data && !usernameCheck.data.available && (
                  <p className="text-xs text-red-400">
                    {usernameCheck.data.message}
                  </p>
                )}
                {usernameCheck.data?.available && username.length >= 3 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-emerald-400 flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Great choice! This username is available
                  </motion.p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!isFormValid || updateUsernameMutation.isPending}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-semibold h-12 rounded-xl shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:shadow-violet-500/30"
              >
                {updateUsernameMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Let's Go!"
                )}
              </Button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-white/30 text-xs mt-6">
            You can change this later in your profile settings
          </p>
        </motion.div>
      </main>
    </div>
  );
}
