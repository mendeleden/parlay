"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/trpc/client";
import {
  Ticket,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const debouncedEmail = useDebounce(email, 500);

  const emailCheck = trpc.auth.checkEmail.useQuery(
    { email: debouncedEmail },
    { enabled: debouncedEmail.includes("@") && debouncedEmail.includes(".") }
  );

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      // Auto sign in after registration
      const result = await signIn("credentials", {
        identifier: email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Account created but sign in failed. Please sign in manually.");
        router.push("/auth/signin");
      } else {
        toast.success("Account created! Let's set up your profile.");
        const onboardingUrl = redirectTo
          ? `/onboarding?redirect=${encodeURIComponent(redirectTo)}`
          : "/onboarding";
        router.push(onboardingUrl);
        router.refresh();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    // Generate a temporary username from email (will be changed in onboarding)
    const tempUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15) + Math.random().toString(36).slice(-4);

    registerMutation.mutate({ email, username: tempUsername, password });
  };

  const isFormValid =
    email.includes("@") &&
    password.length >= 6 &&
    !emailCheck.data?.exists;

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
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between max-w-md mx-auto"
        >
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 bg-theme-gradient-br rounded-xl">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Parlay</span>
          </Link>
          <div className="w-10" />
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-theme-primary-100 border border-theme-primary-200 text-sm text-theme-primary mb-4"
              >
                <Sparkles className="h-4 w-4" />
                Free forever
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Get Started
              </h1>
              <p className="text-white/50">
                Create your account in seconds
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80 text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl h-12 pr-10"
                    required
                  />
                  {debouncedEmail && emailCheck.data && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {emailCheck.data.exists ? (
                        <div className="p-1 bg-red-500/20 rounded-full">
                          <X className="h-3.5 w-3.5 text-red-400" />
                        </div>
                      ) : (
                        <div className="p-1 bg-emerald-500/20 rounded-full">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {emailCheck.data?.exists && (
                  <p className="text-xs text-amber-400">
                    {emailCheck.data.message}{" "}
                    <Link href="/auth/signin" className="underline hover:text-amber-300">
                      Sign in
                    </Link>
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80 text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500 focus:ring-violet-500/20 rounded-xl h-12 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {password.length > 0 && password.length < 6 && (
                  <p className="text-xs text-white/40">At least 6 characters</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={!isFormValid || registerMutation.isPending}
                className="w-full bg-theme-gradient hover:opacity-90 text-white font-semibold h-12 rounded-xl shadow-lg shadow-theme disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl"
              >
                {registerMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Continue"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-center text-white/40 text-sm">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="text-theme-primary-light hover:opacity-80 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-white/30 text-xs mt-6">
            For entertainment only. No real money involved.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
