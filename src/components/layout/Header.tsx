"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { InvitePanel } from "@/components/inventory/InvitePanel";
import { Search, Plus, Home, LogOut, Map, Users, ChevronDown, Sparkles, Menu, X, Share2, Upload } from "lucide-react";

export function Header() {
  const { user, logOut } = useAuthContext();
  const { currentInventory, inventories, selectInventory, clearInventory } = useInventoryContext();
  const pathname = usePathname();
  const [showInvite, setShowInvite] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  async function shareApp() {
    const url = window.location.origin;
    if (navigator.share) {
      try { await navigator.share({ title: "InvenStories", text: "Preserve the stories behind your objects.", url }); }
      catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  const navColor = (path: string) =>
    pathname === path ? "var(--gold)" : "var(--ink-light)";

  return (
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur-sm border-b"
        style={{ background: "var(--parchment-light)", borderColor: "var(--border)" }}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-2">

          {/* ── Left: brand + inventory switcher ── */}
          <div className="relative flex items-center gap-2 min-w-0 flex-1">
            <Link
              href="/"
              data-tour="brand"
              className="font-serif font-bold shrink-0 tracking-tight"
              style={{ color: "var(--ink)", fontSize: "1rem" }}
            >
              InvenStories
            </Link>

            {currentInventory && (
              <>
                <span className="hidden sm:inline select-none" style={{ color: "var(--border)" }}>|</span>
                <button
                  onClick={() => setShowSwitcher((s) => !s)}
                  data-tour="inventory-switcher"
                  className="hidden sm:flex items-center gap-1 font-medium text-sm transition-colors min-w-0"
                  style={{ color: "var(--ink-mid)" }}
                >
                  <span className="truncate max-w-[140px]">{currentInventory.name}</span>
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

          {/* ── Right: desktop nav ── */}
          <nav className="hidden sm:flex items-center gap-0.5 shrink-0">
            <Link href="/" title="Home" data-tour="nav-home"
              className="p-2 rounded transition-colors"
              style={{ color: navColor("/") }}>
              <Home className="w-5 h-5" />
            </Link>
            <Link href="/search" title="Search" data-tour="nav-search"
              className="p-2 rounded transition-colors"
              style={{ color: navColor("/search") }}>
              <Search className="w-5 h-5" />
            </Link>
            <Link href="/map" title="Map" data-tour="nav-map"
              className="p-2 rounded transition-colors"
              style={{ color: navColor("/map") }}>
              <Map className="w-5 h-5" />
            </Link>
            <Link href="/settings" title="Agents" data-tour="nav-agents"
              className="p-2 rounded transition-colors"
              style={{ color: navColor("/settings") }}>
              <Sparkles className="w-5 h-5" />
            </Link>
            {currentInventory && (
              <Link href="/bulk-import" title="Bulk import"
                className="p-2 rounded transition-colors"
                style={{ color: navColor("/bulk-import") }}>
                <Upload className="w-5 h-5" />
              </Link>
            )}
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
            <div className="relative ml-1" data-tour="add-button">
              <button
                onClick={() => setShowAddMenu((s) => !s)}
                className="px-3 py-1.5 text-xs font-semibold rounded transition-opacity hover:opacity-80 flex items-center gap-1"
                style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
              >
                <Plus className="w-3.5 h-3.5" /> Add <ChevronDown className="w-3 h-3 opacity-70" />
              </button>
              {showAddMenu && (
                <div
                  className="absolute top-full right-0 mt-1 w-44 shadow-lg overflow-hidden z-50 border pointer-events-auto"
                  style={{ background: "var(--parchment-light)", borderColor: "var(--border)", borderRadius: "6px" }}
                >
                  <Link href="/add" onClick={() => setShowAddMenu(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                    style={{ color: "var(--ink-mid)", borderBottom: "1px solid var(--border)" }}>
                    <Plus className="w-3.5 h-3.5" /> Add single item
                  </Link>
                  <Link href="/bulk-import" onClick={() => setShowAddMenu(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                    style={{ color: "var(--ink-mid)" }}>
                    <Upload className="w-3.5 h-3.5" /> Bulk import
                  </Link>
                </div>
              )}
            </div>
            {user && (
              <button onClick={() => logOut()}
                className="ml-1 p-2 rounded transition-colors"
                style={{ color: "var(--ink-light)" }}
                title={`Sign out (${user.email})`}>
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </nav>

          {/* ── Right: mobile nav (Search + Add + hamburger) ── */}
          <div className="flex sm:hidden items-center gap-1 shrink-0">
            <Link href="/search" title="Search"
              className="p-2 rounded transition-colors"
              style={{ color: navColor("/search") }}>
              <Search className="w-5 h-5" />
            </Link>
            <Link href="/add" title="Add single item"
              className="px-3 py-1.5 text-xs font-semibold rounded transition-opacity hover:opacity-80 flex items-center gap-1"
              style={{ background: "var(--gold)", color: "var(--parchment-light)" }}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Link>
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="p-2 rounded transition-colors"
              style={{ color: "var(--ink-light)" }}
              title="Menu"
            >
              {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {showMenu && (
          <div
            className="sm:hidden border-t"
            style={{ background: "var(--parchment-light)", borderColor: "var(--border)" }}
          >
            {/* Inventory switcher (mobile) */}
            {currentInventory && (
              <div style={{ borderBottom: "1px solid var(--border)" }}>
                <button
                  onClick={() => setShowSwitcher((s) => !s)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
                  style={{ color: "var(--ink-mid)" }}
                >
                  <span className="truncate">{currentInventory.name}</span>
                  <ChevronDown
                    className="w-4 h-4 shrink-0 transition-transform"
                    style={{ color: "var(--ink-light)", transform: showSwitcher ? "rotate(180deg)" : "none" }}
                  />
                </button>
                {showSwitcher && (
                  <div style={{ borderTop: "1px solid var(--border)", background: "var(--parchment)" }}>
                    {inventories.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => { selectInventory(inv.id); setShowSwitcher(false); setShowMenu(false); }}
                        className="w-full text-left px-6 py-2.5 text-sm font-serif"
                        style={{
                          color: inv.id === currentInventory.id ? "var(--gold)" : "var(--ink-mid)",
                          fontWeight: inv.id === currentInventory.id ? 600 : 400,
                        }}
                      >
                        {inv.name}
                      </button>
                    ))}
                    <button
                      onClick={() => { clearInventory(); setShowSwitcher(false); setShowMenu(false); }}
                      className="w-full text-left px-6 py-2.5 text-sm"
                      style={{ color: "var(--ink-light)", borderTop: "1px solid var(--border)" }}
                    >
                      Switch inventory…
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Nav links */}
            {[
              { href: "/", label: "Home", Icon: Home },
              { href: "/map", label: "Map", Icon: Map },
              { href: "/settings", label: "Agents", Icon: Sparkles },
              { href: "/bulk-import", label: "Bulk Import", Icon: Upload },
            ].map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                style={{
                  color: pathname === href ? "var(--gold)" : "var(--ink-mid)",
                  fontWeight: pathname === href ? 600 : 400,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            {currentInventory && (
              <button
                onClick={() => { setShowInvite(true); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                style={{ color: "var(--ink-mid)", borderBottom: "1px solid var(--border)" }}
              >
                <Users className="w-4 h-4" />
                Members & sharing
              </button>
            )}

            <button
              onClick={() => { shareApp(); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
              style={{ color: "var(--ink-mid)", borderBottom: "1px solid var(--border)" }}
            >
              <Share2 className="w-4 h-4" />
              Share InvenStories
            </button>

            {user && (
              <button
                onClick={() => { logOut(); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                style={{ color: "var(--ink-light)" }}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            )}
          </div>
        )}
      </header>

      {showSwitcher && !showMenu && (
        <div className="fixed inset-0 z-30" onClick={() => setShowSwitcher(false)} />
      )}

      {showAddMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
      )}

      {showMenu && (
        <div className="fixed inset-0 z-30 sm:hidden" onClick={() => { setShowMenu(false); setShowSwitcher(false); }} />
      )}

      {showInvite && <InvitePanel onClose={() => setShowInvite(false)} />}
    </>
  );
}
