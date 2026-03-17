"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { subscribeToUserInventories } from "@/lib/inventories";
import type { InventoryBook, MemberRole } from "@/lib/types";

const LS_KEY = "currentInventoryId";

interface InventoryContextType {
  /** All inventories the current user belongs to */
  inventories: InventoryBook[];
  /** The currently selected inventory (null = none selected yet) */
  currentInventory: InventoryBook | null;
  /** The user's role in the current inventory */
  currentRole: MemberRole | null;
  loadingInventories: boolean;
  selectInventory: (id: string) => void;
  clearInventory: () => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthContext();
  const [inventories, setInventories] = useState<InventoryBook[]>([]);
  const [currentInventoryId, setCurrentInventoryId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null)
  );
  const [loadingInventories, setLoadingInventories] = useState(true);

  // Subscribe to user's inventories in real-time
  useEffect(() => {
    // Don't do anything until Firebase has confirmed the auth state.
    // Without this guard, there's a render where user=resolvedUser but
    // loadingInventories is still false from the prior null-user branch,
    // which causes a flash to InventorySelector before inventories load.
    if (authLoading) return;

    if (!user) {
      setInventories([]);
      setLoadingInventories(false);
      return;
    }
    setLoadingInventories(true);
    const unsub = subscribeToUserInventories(user.uid, (books) => {
      setInventories(books);
      setLoadingInventories(false);

      // Auto-select if only one inventory and none selected yet
      if (books.length === 1 && !currentInventoryId) {
        setCurrentInventoryId(books[0].id);
        localStorage.setItem(LS_KEY, books[0].id);
      }

      // If persisted ID no longer valid (removed from inventory), clear it
      if (currentInventoryId && books.length > 0 && !books.find((b) => b.id === currentInventoryId)) {
        setCurrentInventoryId(null);
        localStorage.removeItem(LS_KEY);
      }
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, authLoading]);

  const selectInventory = useCallback((id: string) => {
    setCurrentInventoryId(id);
    localStorage.setItem(LS_KEY, id);
  }, []);

  const clearInventory = useCallback(() => {
    setCurrentInventoryId(null);
    localStorage.removeItem(LS_KEY);
  }, []);

  const currentInventory = inventories.find((b) => b.id === currentInventoryId) ?? null;
  const currentRole = user && currentInventory
    ? (currentInventory.members[user.uid]?.role ?? null)
    : null;

  return (
    <InventoryContext.Provider value={{
      inventories,
      currentInventory,
      currentRole,
      loadingInventories,
      selectInventory,
      clearInventory,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventoryContext() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventoryContext must be used within InventoryProvider");
  return ctx;
}
