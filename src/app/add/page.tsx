"use client";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { InventorySelector } from "@/components/inventory/InventorySelector";
import { Header } from "@/components/layout/Header";
import { AddItemFlow } from "@/components/inventory/AddItemFlow";

export default function AddPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { currentInventory, loadingInventories } = useInventoryContext();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginForm />;
  if (!loadingInventories && !currentInventory) return <InventorySelector />;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <AddItemFlow />
      </main>
    </div>
  );
}
