"use client";

import { useState } from "react";
import { ImportBetsModal } from "@/components/markets/import-bets-modal";
import { Button } from "@/components/ui/button";

export default function TestImportPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Import Modal Test</h1>
      <Button onClick={() => setOpen(true)}>Open Import Modal</Button>

      <ImportBetsModal
        open={open}
        onOpenChange={setOpen}
        groupId="test-group-id"
        onImportComplete={() => {
          console.log("Import complete");
        }}
      />
    </div>
  );
}
