"use client";

import { useState, useDeferredValue } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Header } from "@/components/layout/Header";
import { ItemCard } from "@/components/inventory/ItemCard";
import { useInventory } from "@/hooks/useInventory";
import { Search, X } from "lucide-react";

export default function SearchPage() {
  const { user, loading } = useAuthContext();
  const { items, loading: itemsLoading } = useInventory();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginForm />;

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
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="search"
            placeholder="Search names, stories, locations, categories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-stone-200 rounded-2xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-sm text-stone-500 mb-4">
          {itemsLoading
            ? "Loading..."
            : `${results.length} ${results.length === 1 ? "result" : "results"}`}
          {query && ` for "${query}"`}
        </p>

        {results.length === 0 && !itemsLoading ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-stone-500">No items match your search</p>
            <p className="text-stone-400 text-sm mt-1">
              Try different keywords — stories, locations, or categories
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
    </div>
  );
}
