"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { InvitePanel } from "@/components/inventory/InvitePanel";
import { Search, Plus, Home, LogOut, Map, Users, ChevronDown, Sparkles } from "lucide-react";

export function Header() {
  const { user, logOut } = useAuthContext();
  const { currentInventory, inventories, selectInventory, clearInventory } = useInventoryContext();
  const pathname = usePathname();
  const [showInvite, setShowInvite] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur-sm border-b"
        style={{ background: "var(--parchment-light)", borderColor: "var(--border)" }}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: brand + inventory name */}
          <div className="relative flex items-center gap-2 min-w-0">
            <Link href="/" className="font-serif font-bold shrink-0 tracking-tight" style={{ color: "var(--ink)", fontSize: "1rem" }}>
              InvenStories
            </Link>

            {currentInventory && (
              <>
                <span className="select-none" style={{ color: "var(--border)" }}>|</span>
                <button
                  onClick={() => setShowSwitcher((s) => !s)}
                  className="flex items-center gap-1 font-medium text-sm transition-colors truncate"
                  style={{ color: "var(--ink-mid)" }}
                >
                  <span className="truncate">{currentInventory.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--ink-light)" }} />
                </button>

                {showSwitcher && (
                  <div
                    className="absolute top-full left-0 mt-2 w-56 shadow-lg overflow-hidden z-50 border"
                    style={{ background: "var(--parchment-light)", borderColor: "var(--border)", borderRadius: "4px" }}
                  >
                    {inventories.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => { selectInventory(inv.id); setShowSwitcher(false); }}
                        className="w-full text-left px-4 py-3 text-sm transition-colors font-serif"
                        style={{
                          background: inv.id === currentInventory.id ? "var(--parchment-dark)" : "transparent",
                          color: inv.id === currentInventory.id ? "var(--gold)" : "var(--ink-mid)",
                          fontWeight: inv.id === currentInventory.id ? 600 : 400,
                        }}
                      >
                        {inv.name}
                      </button>
                    ))}
                    <div style={{ borderTop: "1px solid var(--border)" }}>
                      <button
                        onClick={() => { clearInventory(); setShowSwitcher(false); }}
                        className="w-full text-left px-4 py-3 text-sm transition-colors"
                        style={{ color: "var(--ink-light)" }}
                      >
                        Switch inventory…
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <nav className="flex items-center gap-0.5">
            <Link href="/" title="Table of Contents"
              className="p-2 rounded transition-colors"
              style={{ color: pathname === "/" ? "var(--gold)" : "var(--ink-light)" }}>
              <Home className="w-5 h-5" />
            </Link>
            <Link href="/search" title="Search"
              className="p-2 rounded transition-colors"
              style={{ color: pathname === "/search" ? "var(--gold)" : "var(--ink-light)" }}>
              <Search className="w-5 h-5" />
            </Link>
            <Link href="/map" title="Map"
              className="p-2 rounded transition-colors"
              style={{ color: pathname === "/map" ? "var(--gold)" : "var(--ink-light)" }}>
              <Map className="w-5 h-5" />
            </Link>
            <Link href="/settings" title="Agents"
              className="p-2 rounded transition-colors"
              style={{ color: pathname === "/settings" ? "var(--gold)" : "var(--ink-light)" }}>
              <Sparkles className="w-5 h-5" />
            </Link>
            {currentInventory && (
              <button
                onClick={() => setShowInvite(true)}
                className="p-2 rounded transition-colors"
                style={{ color: "var(--ink-light)" }}
                title="Members & sharing"
              >
                <Users className="w-5 h-5" />
              </button>
            )}
            <Link href="/add" title="Add entry"
              className="ml-1 px-3 py-1.5 text-xs font-semibold rounded transition-opacity hover:opacity-80 flex items-center gap-1"
              style={{ background: "var(--gold)", color: "var(--parchment-light)" }}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Link>
            {user && (
              <button onClick={() => logOut()}
                className="ml-1 p-2 rounded transition-colors"
                style={{ color: "var(--ink-light)" }}
                title={`Sign out (${user.email})`}>
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </nav>
        </div>
      </header>

      {showSwitcher && (
        <div className="fixed inset-0 z-30" onClick={() => setShowSwitcher(false)} />
      )}

      {showInvite && <InvitePanel onClose={() => setShowInvite(false)} />}
    </>
  );
}
