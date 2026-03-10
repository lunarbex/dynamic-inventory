"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Search, Plus, Home, LogOut, Map } from "lucide-react";

export function Header() {
  const { user, logOut } = useAuthContext();
  const pathname = usePathname();

  function navClass(path: string) {
    return `p-2 rounded-lg transition-colors ${
      pathname === path
        ? "text-amber-600 bg-amber-50"
        : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
    }`;
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-stone-800 text-lg">
          Object Stories
        </Link>
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
  );
}
