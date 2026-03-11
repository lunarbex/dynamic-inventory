"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { InvitePanel } from "@/components/inventory/InvitePanel";
import { Search, Plus, Home, LogOut, Map, Users, ChevronDown } from "lucide-react";

export function Header() {
  const { user, logOut } = useAuthContext();
  const { currentInventory, inventories, selectInventory, clearInventory } = useInventoryContext();
  const pathname = usePathname();
  const [showInvite, setShowInvite] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);

  function navClass(path: string) {
    return `p-2 rounded-lg transition-colors ${
      pathname === path
        ? "text-amber-600 bg-amber-50"
        : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
    }`;
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: inventory name + switcher */}
          {currentInventory ? (
            <div className="relative">
              <button
                onClick={() => setShowSwitcher((s) => !s)}
                className="flex items-center gap-1.5 text-stone-800 font-semibold text-base hover:text-amber-600 transition-colors"
              >
                {currentInventory.name}
                {inventories.length > 1 && <ChevronDown className="w-4 h-4 text-stone-400" />}
              </button>

              {showSwitcher && inventories.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-stone-200 rounded-2xl shadow-lg overflow-hidden z-50">
                  {inventories.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => { selectInventory(inv.id); setShowSwitcher(false); }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        inv.id === currentInventory.id
                          ? "bg-amber-50 text-amber-700 font-medium"
                          : "text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      {inv.name}
                    </button>
                  ))}
                  <div className="border-t border-stone-100">
                    <button
                      onClick={() => { clearInventory(); setShowSwitcher(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
                    >
                      Switch inventory…
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/" className="font-semibold text-stone-800 text-lg">
              Object Stories
            </Link>
          )}

          <nav className="flex items-center gap-1">
            <Link href="/" className={navClass("/")} title="Home">
              <Home className="w-5 h-5" />
            </Link>
            <Link href="/search" className={navClass("/search")} title="Search">
              <Search className="w-5 h-5" />
            </Link>
            <Link href="/map" className={navClass("/map")} title="Map">
              <Map className="w-5 h-5" />
            </Link>
            {currentInventory && (
              <button
                onClick={() => setShowInvite(true)}
                className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                title="Members & sharing"
              >
                <Users className="w-5 h-5" />
              </button>
            )}
            <Link href="/add" className="ml-1 p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors" title="Add item">
              <Plus className="w-5 h-5" />
            </Link>
            {user && (
              <button onClick={() => logOut()}
                className="ml-1 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                title={`Sign out (${user.email})`}>
                <LogOut className="w-5 h-5" />
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
