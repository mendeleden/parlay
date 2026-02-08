"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, Construction } from "lucide-react";

export default function CreateParlayPage() {
  const router = useRouter();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md mx-auto px-4"
      >
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6">
          <Construction className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Create Parlays from Your Wagers
        </h1>
        <p className="text-muted-foreground mb-6">
          To create a parlay, first place wagers on different bets within a group.
          Then you can combine those wagers into a parlay for bigger potential payouts!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button
            onClick={() => router.push("/groups")}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
          >
            <Layers className="mr-2 h-4 w-4" />
            Browse Groups
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
