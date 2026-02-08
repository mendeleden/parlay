"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  X,
  Loader2,
  Import,
  Trophy,
  Landmark,
  Bitcoin,
  Film,
  Star,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Clock,
  ArrowLeft,
  Check,
  Plus,
  Link2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { MarketCard } from "./market-card";
import { MARKET_CATEGORIES, type MarketCategory } from "@/lib/polymarket";
import type { ExternalMarket } from "@/lib/polymarket";
import { toast } from "sonner";
import { formatAmericanOdds } from "@/lib/odds";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  sports: Trophy,
  politics: Landmark,
  crypto: Bitcoin,
  entertainment: Film,
  "pop-culture": Star,
  business: TrendingUp,
};

type MarketSource = "polymarket" | "kalshi";

interface ImportBetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onImportComplete?: () => void;
}

export function ImportBetsModal({
  open,
  onOpenChange,
  groupId,
  onImportComplete,
}: ImportBetsModalProps) {
  const [source, setSource] = useState<MarketSource>("polymarket");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MarketCategory | undefined>(undefined);
  const [selectedMarkets, setSelectedMarkets] = useState<Map<string, ExternalMarket>>(new Map());
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [previewMarket, setPreviewMarket] = useState<ExternalMarket | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [debouncedUrl, setDebouncedUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounce URL input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUrl(urlInput), 500);
    return () => clearTimeout(timer);
  }, [urlInput]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setUrlInput("");
      setDebouncedUrl("");
      setCategory(undefined);
      setShowUrlInput(false);
    }
  }, [open]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // Fetch markets from selected source
  const { data, isLoading, error, refetch } = trpc.markets.browse.useQuery(
    {
      source,
      category,
      search: debouncedSearch || undefined,
      limit: 50,
    },
    {
      enabled: open && !showUrlInput,
      staleTime: 30000,
      refetchOnMount: true,
    }
  );

  // Refetch when source or category changes
  useEffect(() => {
    if (open && !showUrlInput) {
      refetch();
    }
  }, [source, category, open, showUrlInput, refetch]);

  // URL import query - check if URL looks valid
  const isValidUrl = debouncedUrl.includes("polymarket.com") || debouncedUrl.includes("kalshi.com");

  const urlImportQuery = trpc.markets.importByUrl.useQuery(
    { url: debouncedUrl },
    {
      enabled: open && showUrlInput && isValidUrl,
      staleTime: 60000,
      retry: false,
    }
  );

  const markets = showUrlInput
    ? (urlImportQuery.data?.markets || [])
    : (data?.markets || []);

  // Import mutation
  const importMutation = trpc.markets.importBatch.useMutation({
    onSuccess: (result) => {
      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} bet${result.imported > 1 ? "s" : ""}`);
        setSelectedMarkets(new Map());
        onImportComplete?.();
        onOpenChange(false);
      }
      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} market${result.failed > 1 ? "s" : ""}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import markets");
    },
  });

  const toggleSelection = (market: ExternalMarket) => {
    setSelectedMarkets((prev) => {
      const next = new Map(prev);
      if (next.has(market.id)) {
        next.delete(market.id);
      } else {
        next.set(market.id, market);
      }
      return next;
    });
  };

  const selectAll = () => {
    const newSelected = new Map(selectedMarkets);
    markets.forEach((m) => newSelected.set(m.id, m));
    setSelectedMarkets(newSelected);
  };

  const clearSelection = () => {
    setSelectedMarkets(new Map());
  };

  const handleImport = () => {
    if (selectedMarkets.size === 0) return;

    const marketsToImport = Array.from(selectedMarkets.values()).map((market) => ({
      source: market.source,
      marketId: market.id,
    }));

    importMutation.mutate({
      groupId,
      markets: marketsToImport,
    });
  };

  const selectedCount = selectedMarkets.size;
  const isUrlLoading = showUrlInput && urlImportQuery.isLoading && isValidUrl;
  const isMarketsLoading = !showUrlInput && isLoading;
  const urlError = showUrlInput && urlImportQuery.error;
  const urlHasNoResults = showUrlInput && isValidUrl && !urlImportQuery.isLoading && markets.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Import className="w-5 h-5 text-theme-primary" />
            Import Bets from Prediction Markets
          </DialogTitle>
        </DialogHeader>

        {/* Source Tabs */}
        <div className="px-6 pt-4 pb-3 border-b bg-muted/50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSource("polymarket");
                setShowUrlInput(false);
                setUrlInput("");
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                source === "polymarket" && !showUrlInput
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:border-violet-300 hover:text-violet-600"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Polymarket
            </button>
            <button
              onClick={() => {
                setSource("kalshi");
                setShowUrlInput(false);
                setUrlInput("");
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                source === "kalshi" && !showUrlInput
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-600"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Kalshi
            </button>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <button
              onClick={() => {
                setShowUrlInput(!showUrlInput);
                if (!showUrlInput) {
                  setSearch("");
                  setDebouncedSearch("");
                }
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                showUrlInput
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600"
              )}
            >
              <Link2 className="w-4 h-4" />
              Import by URL
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 bg-muted border-b space-y-3 shrink-0">
          {showUrlInput ? (
            /* URL Input */
            <div className="space-y-2">
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Paste Polymarket or Kalshi URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="pl-10 bg-card"
                />
                {urlInput && (
                  <button
                    onClick={() => setUrlInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Example: https://polymarket.com/event/super-bowl-lx-coin-toss or https://kalshi.com/markets/...
              </p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${source === "polymarket" ? "Polymarket" : "Kalshi"} markets...`}
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-card"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setDebouncedSearch("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <button
                  onClick={() => setCategory(undefined)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    category === undefined
                      ? "bg-theme-primary-500 text-white shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:border-border"
                  )}
                >
                  All
                </button>
                {MARKET_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id] || Star;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id as MarketCategory)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                        category === cat.id
                          ? "bg-theme-primary-500 text-white shadow-sm"
                          : "bg-card border border-border text-muted-foreground hover:border-border"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Selection bar */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 py-3 bg-theme-primary-50 border-b flex items-center justify-between shrink-0 overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-theme-primary-700">
                  {selectedCount} market{selectedCount > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-theme-primary-600 hover:text-theme-primary-800 underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-theme-primary-600 hover:text-theme-primary-800"
                >
                  Select all visible
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Markets grid */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {isMarketsLoading || isUrlLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-theme-primary mb-3" />
                <p className="text-muted-foreground">
                  {showUrlInput ? "Fetching market from URL..." : "Loading markets..."}
                </p>
              </div>
            ) : error || (showUrlInput && urlImportQuery.error) ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
                <p className="text-foreground font-medium">
                  {showUrlInput ? "Could not find market" : "Failed to load markets"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {showUrlInput
                    ? "Make sure the URL is valid and the market exists"
                    : "Please try again later"}
                </p>
              </div>
            ) : markets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                {showUrlInput && !isValidUrl ? (
                  <>
                    <Link2 className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-foreground font-medium">Paste a market URL</p>
                    <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
                      Enter a Polymarket or Kalshi URL to import that specific market
                    </p>
                    <div className="mt-4 text-xs text-muted-foreground space-y-1">
                      <p>Examples:</p>
                      <p className="font-mono">https://polymarket.com/event/super-bowl-lx-coin-toss</p>
                      <p className="font-mono">https://kalshi.com/markets/KXSUPERBOWL/...</p>
                    </div>
                  </>
                ) : urlHasNoResults ? (
                  <>
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
                    <p className="text-foreground font-medium">No markets found at this URL</p>
                    <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
                      The URL might be invalid or the market may no longer exist
                    </p>
                  </>
                ) : (
                  <>
                    <Search className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-foreground font-medium">No markets found</p>
                    <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
                      {debouncedSearch
                        ? "Try a different search term or use 'Import by URL' for specific markets"
                        : "Try selecting a different category or use URL import for specific markets"}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {markets.map((market) => (
                  <MarketCard
                    key={`${market.source}-${market.id}`}
                    market={market}
                    selected={selectedMarkets.has(market.id)}
                    onSelect={() => toggleSelection(market)}
                    onPreview={() => setPreviewMarket(market)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted border-t flex items-center justify-between shrink-0">
          <p className="text-sm text-muted-foreground">
            Markets from{" "}
            <a
              href={source === "polymarket" ? "https://polymarket.com" : "https://kalshi.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-primary hover:underline"
            >
              {source === "polymarket" ? "Polymarket" : "Kalshi"}
            </a>
          </p>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || importMutation.isPending}
              className="bg-theme-gradient hover:opacity-90"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Import className="w-4 h-4 mr-2" />
                  Import {selectedCount > 0 ? `(${selectedCount})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Preview Panel */}
        <AnimatePresence>
          {previewMarket && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0 bg-card flex flex-col z-10"
            >
              {/* Preview Header */}
              <div className="px-6 py-4 border-b flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setPreviewMarket(null)}
                  className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Market Details</h3>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    previewMarket.source === "polymarket"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-emerald-100 text-emerald-700"
                  )}>
                    {previewMarket.source === "polymarket" ? "Polymarket" : "Kalshi"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={selectedMarkets.has(previewMarket.id) ? "outline" : "default"}
                  onClick={() => toggleSelection(previewMarket)}
                  className={selectedMarkets.has(previewMarket.id) ? "" : "bg-theme-gradient"}
                >
                  {selectedMarkets.has(previewMarket.id) ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Selected
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Select
                    </>
                  )}
                </Button>
              </div>

              {/* Preview Content */}
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Image */}
                  {previewMarket.imageUrl && (
                    <div className="relative h-48 rounded-xl overflow-hidden bg-muted">
                      <img
                        src={previewMarket.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-full">
                        <TrendingUp className="w-4 h-4" />
                        {previewMarket.volume} volume
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {previewMarket.title}
                    </h2>
                    {previewMarket.endDate && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Ends {new Date(previewMarket.endDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {previewMarket.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">
                        {previewMarket.description}
                      </p>
                    </div>
                  )}

                  {/* Options */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Betting Options</h4>
                    <div className="space-y-2">
                      {previewMarket.options.map((option, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-muted rounded-xl"
                        >
                          <span className="font-medium text-foreground">{option.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              {(option.probability * 100).toFixed(0)}% chance
                            </span>
                            <span
                              className={cn(
                                "font-mono font-bold px-2.5 py-1 rounded-lg text-sm",
                                option.americanOdds > 0
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-theme-primary-100 text-theme-primary-700"
                              )}
                            >
                              {formatAmericanOdds(option.americanOdds)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  {previewMarket.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {previewMarket.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-sm capitalize"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source link */}
                  <a
                    href={previewMarket.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-theme-primary hover:underline text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on {previewMarket.source === "polymarket" ? "Polymarket" : "Kalshi"}
                  </a>
                </div>
              </ScrollArea>

              {/* Preview Footer */}
              <div className="px-6 py-4 border-t bg-muted shrink-0">
                <Button
                  className="w-full bg-theme-gradient"
                  onClick={() => {
                    if (!selectedMarkets.has(previewMarket.id)) {
                      toggleSelection(previewMarket);
                    }
                    setPreviewMarket(null);
                  }}
                >
                  {selectedMarkets.has(previewMarket.id) ? (
                    "Back to Markets"
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Select & Continue
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
