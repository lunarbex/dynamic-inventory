"use client";

import { useState, useDeferredValue, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { Header } from "@/components/layout/Header";
import { ItemCard } from "@/components/inventory/ItemCard";
import { useInventory } from "@/hooks/useInventory";
import { Search, X } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const { currentInventory } = useInventoryContext();
  const { items, loading: itemsLoading } = useInventory(currentInventory?.id ?? null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const deferredQuery = useDeferredValue(query);

  const results = deferredQuery.trim()
    ? items.filter((item) => {
        const q = deferredQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.story.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.provenance.toLowerCase().includes(q) ||
          (item.microLocation || item.macroLocation || item.location || "").toLowerCase().includes(q) ||
          (item.originPlace?.name ?? "").toLowerCase().includes(q) ||
          (item.passTo ?? "").toLowerCase().includes(q) ||
          item.categories.some((c) => c.toLowerCase().includes(q)) ||
          item.voiceTranscript.toLowerCase().includes(q) ||
          (item.tags ?? []).some((t) => t.toLowerCase().includes(q))
        );
      })
    : items;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      {/* Search input */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--ink-light)" }} />
        <input
          type="search"
          placeholder="Search names, stories, locations, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full pl-11 pr-10 py-3 text-sm focus:outline-none"
          style={{
            background: "var(--parchment-light)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
            style={{ color: "var(--ink-light)" }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--ink-light)" }}>
        {itemsLoading ? "Loading…" : `${results.length} ${results.length === 1 ? "result" : "results"}`}
        {query && <> for <span className="font-medium" style={{ color: "var(--ink-mid)" }}>"{query}"</span></>}
      </p>

      {results.length === 0 && !itemsLoading ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-serif" style={{ color: "var(--ink-mid)" }}>No entries match your search</p>
          <p className="text-sm mt-1" style={{ color: "var(--ink-light)" }}>
            Try different keywords — names, stories, locations, or tags
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {results.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--parchment)" }}>
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) return <LoginForm />;

  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      <Header />
      <Suspense fallback={
        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="h-12 animate-pulse mb-5" style={{ background: "var(--parchment-dark)" }} />
        </main>
      }>
        <SearchContent />
      </Suspense>
    </div>
  );
}
