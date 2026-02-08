"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  Ticket,
  Users,
  TrendingUp,
  Zap,
  ChevronRight,
  Trophy,
  Target,
  Sparkles,
  Dices,
} from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const floatAnimation = {
  y: [0, -15, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

const features = [
  {
    icon: Users,
    title: "Private Groups",
    description: "Create invite-only betting pools with friends",
    color: "from-yellow-400 to-orange-500",
    bg: "bg-yellow-400/20",
  },
  {
    icon: TrendingUp,
    title: "Real Odds",
    description: "American odds like the pros use",
    color: "from-emerald-400 to-green-500",
    bg: "bg-emerald-400/20",
  },
  {
    icon: Zap,
    title: "Parlays",
    description: "Stack bets for massive payouts",
    color: "from-pink-400 to-rose-500",
    bg: "bg-pink-400/20",
  },
];

const stats = [
  { value: "0", label: "Real Money", icon: Trophy },
  { value: "100%", label: "Bragging Rights", icon: Target },
  { value: "∞", label: "Fun", icon: Sparkles },
];

export default function LandingPage() {
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 150]);

  return (
    <div className="min-h-screen bg-[#0A0118] overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Main gradient orbs */}
        <motion.div
          style={{ y: backgroundY }}
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
          className="absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full"
          animate={{
            background: [
              "radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)",
              "radial-gradient(circle, rgba(244, 114, 182, 0.3) 0%, transparent 70%)",
              "radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)",
            ],
          }}
          transition={{ duration: 6, repeat: Infinity, delay: 1 }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full"
          animate={{
            background: [
              "radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%)",
              "radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)",
              "radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%)",
            ],
          }}
          transition={{ duration: 7, repeat: Infinity, delay: 2 }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="px-6 py-5">
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-theme-gradient-br rounded-xl shadow-lg shadow-theme">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Parlay</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="dark" />
              <SignInButton mode="modal" forceRedirectUrl="/groups">
                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10 rounded-full px-6"
                >
                  Sign In
                </Button>
              </SignInButton>
            </div>
          </motion.nav>
        </header>

        {/* Hero */}
        <main className="px-6 pt-12 pb-24 sm:pt-20">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-4xl mx-auto text-center"
          >
            {/* Floating icon */}
            <motion.div
              animate={floatAnimation}
              className="inline-block mb-8"
            >
              <div className="p-5 bg-theme-gradient-br rounded-3xl shadow-2xl shadow-theme">
                <Dices className="h-16 w-16 sm:h-20 sm:w-20 text-white" />
              </div>
            </motion.div>

            {/* Badge */}
            <motion.div variants={item} className="mb-8">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                No real money. Just bragging rights.
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={item}
              className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6"
            >
              Bet with your{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                friends
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={item}
              className="text-xl sm:text-2xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Create bets, set real odds, build parlays, and settle scores with
              your crew. The ultimate social betting experience.
            </motion.p>

            {/* CTA */}
            <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignUpButton mode="modal" forceRedirectUrl="/groups">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-theme-gradient hover:opacity-90 text-white font-semibold text-lg px-8 py-7 rounded-2xl shadow-xl shadow-theme transition-all hover:shadow-2xl hover:scale-105"
                >
                  Get Started Free
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal" forceRedirectUrl="/groups">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-white/20 bg-transparent text-white/90 hover:text-white hover:bg-white/10 font-semibold text-lg px-8 py-7 rounded-2xl"
                >
                  I have an account
                </Button>
              </SignInButton>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-2xl mx-auto mt-20 grid grid-cols-3 gap-4"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={item}
                className="text-center p-4"
              >
                <div className="flex justify-center mb-2">
                  <stat.icon className="h-5 w-5 text-white/40" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Features */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-4xl mx-auto mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={item}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                {/* Glow effect on hover */}
                <div
                  className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl`}
                />

                <div className="relative">
                  <div
                    className={`${feature.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* How it works preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="max-w-4xl mx-auto mt-24"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                How it works
              </h2>
              <p className="text-white/50">Three steps to betting glory</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Create a Group",
                  desc: "Invite your friends with a unique code",
                },
                {
                  step: "02",
                  title: "Set Up Bets",
                  desc: "Add options with real American odds",
                },
                {
                  step: "03",
                  title: "Place Wagers",
                  desc: "See your potential payout instantly",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="relative"
                >
                  <div className="text-6xl font-bold text-white/5 mb-2">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-white/50 text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-white/5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-white/40" />
              <span className="text-white/40 font-medium">Parlay</span>
            </div>
            <p className="text-white/30 text-sm text-center sm:text-left">
              For entertainment only. No real money involved.
            </p>
          </motion.div>
        </footer>
      </div>
    </div>
  );
}
